import {
	GoogleGenerativeAIEmbeddings,
	ChatGoogleGenerativeAI,
} from "@langchain/google-genai";
import { AIMessage, BaseMessage, HumanMessage, tool } from "langchain";
import {
	ChatPromptTemplate,
	MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";
import { z } from "zod";
import "dotenv/config";

const retryWithBackoff = async <T>(
	fn: () => Promise<T>,
	maxRetries: number = 3
): Promise<T> => {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			if (
				error instanceof Error &&
				"status" in error &&
				(error as any).status === 429 &&
				attempt < maxRetries
			) {
				const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
				console.error(`Rate limit hit. Retrying in ${delay / 1000} seconds`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}
			throw error;
		}
	}
	throw new Error("Max retries exceeded");
};

export const callAgent = async (
	client: MongoClient,
	message: string,
	id: string
) => {
	try {
		const dbName = "inventory_database";
		const db = client.db(dbName);
		const collection = db.collection("items");

		const GraphState = Annotation.Root({
			messages: Annotation<BaseMessage[]>({
				reducer: (x, y) => x.concat(y),
			}),
		});

		const itemLookupTool = tool(
			async ({ query, n = 10 }) => {
				try {
					console.log("Item lookup tool called with query:", query);
					const totalCount = await collection.countDocuments();
					console.log(`Total documents in collection: ${totalCount}`);
					if (totalCount === 0) {
						console.log("Collection is empty");
						return JSON.stringify({
							error: "No items found in inventory",
							message: "The inventory database appears to ne empty",
							count: 0,
						});
					}

					const sampleDocs = await collection.find({}).limit(3).toArray();
					console.log("Sample documents:", sampleDocs);

					const dbConfig = {
						collection,
						indexName: "vector_index",
						textKey: "embedding_text",
						embeddingKey: "embedding",
					};

					const vectorStore = new MongoDBAtlasVectorSearch(
						new GoogleGenerativeAIEmbeddings({
							apiKey: process.env.GOOGLE_API_KEY,
							model: "text-embedding-004",
						}),
						dbConfig
					);
					console.log("Performing vector search...");
					const result = await vectorStore.similaritySearchWithScore(query, n);
					console.log(`Vector search returned ${result.length} results`);

					if (result.length === 0) {
						console.log(
							"Vector search returned no results, trying text search..."
						);
						const textResult = await collection
							.find({
								$or: [
									{ item_name: { $regex: query, $options: "i" } },
									{ item_description: { $regex: query, $options: "i" } },
									{ categories: { $regex: query, $options: "i" } },
									{ embedding_text: { $regex: query, $options: "i" } },
								],
							})
							.limit(n)
							.toArray();

						console.log(`Text search returned ${textResult.length} results`);

						return JSON.stringify({
							results: textResult,
							searchType: "text",
							query,
							count: textResult.length,
						});
					}
					return JSON.stringify({
						results: result,
						searchType: "vector",
						query,
						count: result.length,
					});
				} catch (error) {
					console.error("Error in item lookup:", error);
					console.error("Error details:", {
						message: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined,
						name: error instanceof Error ? error.name : "Unknown",
					});

					return JSON.stringify({
						error: "Failde to seach inventory",
						details: error instanceof Error ? error.message : String(error),
						query,
					});
				}
			},
			{
				name: "item_lookup",
				description:
					"Gathers furniture item details from the Inventory database",
				schema: z.object({
					query: z.string().describe("The search query"),
					n: z
						.number()
						.optional()
						.default(10)
						.describe("Number of results to return"),
				}),
			}
		);

		const tools = [itemLookupTool];

		const toolNode = new ToolNode<typeof GraphState.State>(tools);

		const model = new ChatGoogleGenerativeAI({
			model: "gemini-2.5-flash",
			temperature: 0,
			maxRetries: 0,
			apiKey: process.env.GOOGLE_API_KEY,
		}).bindTools(tools);

		const shouldContinue = (state: typeof GraphState.State) => {
			const messages = state.messages;
			const lastMessage = messages[messages.length - 1] as AIMessage;

			if (lastMessage.tool_calls?.length) {
				return "tools";
			}
			return "__end__";
		};

		const callModel = async (state: typeof GraphState.State) => {
			return retryWithBackoff(async () => {
				const prompt = ChatPromptTemplate.fromMessages([
					[
						"system",
						`You are a hrlpful E-Commerce Chatbot Agent for a furniture store.
					IMPORTANT: You have access to an item_lookup tool that searches the
					furniture inventory database. ALWAYS use this tool when customers
					ask about futiniture items, even if the tool returns errors or empty results.
					
					When using the item_lookup tool:
					-If it returns results, provide helpful details about the furniture items
					-IF it returns an error or no results, acknowledge this and offer to help in other ways.
					-If the database appears to be empty, let the customer know that inventory might be being updates.
					
					Current time: {time}`,
					],
					new MessagesPlaceholder("messages"),
				]);

				const formattedPrompt = await prompt.formatMessages({
					time: new Date().toISOString(),
					messages: state.messages,
				});

				const result = await model.invoke(formattedPrompt);

				return { messages: [result] };
			});
		};

		const workflow = new StateGraph(GraphState)
			.addNode("agent", callModel)
			.addNode("tools", toolNode)
			.addEdge("__start__", "agent")
			.addConditionalEdges("agent", shouldContinue)
			.addEdge("tools", "agent");

		const checkpointer = new MongoDBSaver({ client, dbName });
		const app = workflow.compile({ checkpointer });

		const finalState = await app.invoke(
			{
				messages: [new HumanMessage(message)],
			},
			{
				recursionLimit: 15,
				configurable: { thread_id: id },
			}
		);

		const response =
			finalState.messages[finalState.messages.length - 1].content;

		console.log("Agent response:", response);

		return response;
	} catch (error) {
		console.error(
			"Error in callAgent:",
			error instanceof Error ? error.message : String(error)
		);

		if (
			error instanceof Error &&
			"status" in error &&
			(error as any).status === 429
		) {
			throw new Error(
				"Service temporarily unavailable due to rate limits. Please try again later."
			);
		} else if (
			error instanceof Error &&
			"status" in error &&
			(error as any).status === 401
		) {
			throw new Error(
				"Authentication failed. Please check your API configuration."
			);
		} else {
			throw new Error(
				`Agent failed: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}
};
