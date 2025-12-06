import { FaRobot, FaPaperPlane, FaTimes, FaCommentDots } from "react-icons/fa";
import { useState, useEffect, useRef } from "react";

interface Message {
	text?: string;
	isAgent: boolean;
}

const ChatWidget = () => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [inputValue, setInputValue] = useState<string>("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [threadId, setThreadId] = useState(null);

	const messageEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen && messages.length === 0) {
			const initialMessages = [
				{
					text: "Hello! I'm yout shoppping assistant. How can I help you today?",
					isAgent: true,
				},
			];

			setMessages(initialMessages);
		}
	}, [isOpen, messages.length]);

	useEffect(() => {
		messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const toggleChat = () => {
		setIsOpen(!isOpen);
	};

	const handleMessage = async (e: React.ChangeEvent<HTMLFormElement>) => {
		e.preventDefault();

		const message = {
			text: inputValue,
			isAgent: false,
		};

		setMessages((prevMessages) => [...prevMessages, message]);
		setInputValue("");

		const endpoint = threadId
			? `http://localhost:8000/chat${threadId}`
			: "http://localhost:8000/chat";

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify({
					message: inputValue,
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			const data = await response.json();

			const agentResponse = {
				text: data.response,
				isAgent: true,
				threadId: data.threadId,
			};

			setMessages((prevMessages) => [...prevMessages, agentResponse]);
			setThreadId(data.threadId);
		} catch (error) {
			console.error(error);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let text = e.target.value;
		setInputValue(text);
	};

	return (
		<div className={`chat-widget-container ${isOpen ? "open" : ""}`}>
			{isOpen ? (
				<>
					<div className="chat-header">
						<div className="chat-title">
							<FaRobot />
							<h3>Shop Assistant</h3>
						</div>
						<button className="close-button" onClick={toggleChat}>
							<FaTimes />
						</button>
					</div>
					<div className="chat-messages">
						{messages.map((message, index) => (
							<div key={index}>
								<div
									className={`message ${
										message.isAgent ? "message-bot" : "message-user"
									}`}
								>
									{message.text}
								</div>
							</div>
						))}
						<div ref={messageEndRef}></div>
					</div>
					<form className="chat-input-container" onSubmit={handleMessage}>
						<input
							type="text"
							className="message-input"
							placeholder="Type your message..."
							value={inputValue}
							onChange={handleInputChange}
						/>
						<button
							type="submit"
							className="send-button"
							disabled={inputValue.trim() === ""}
						>
							<FaPaperPlane size={16} />
						</button>
					</form>
				</>
			) : (
				<>
					<button className="chat-button" onClick={toggleChat}>
						<FaCommentDots />
					</button>
				</>
			)}
		</div>
	);
};

export default ChatWidget;
