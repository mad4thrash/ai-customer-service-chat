import { FaSearch, FaShoppingCart, FaHeart } from "react-icons/fa";
import ChatWidget from "./ChatWidget";

const EcommerceStore = () => {
	return (
		<>
			<header className="header">
				<div className="container">
					<div className="top-bar">
						<div className="logo">ShopSmart</div>
						<div className="search-bar">
							<input type="text" placeholder="Search for products..." />
							<button>
								<FaSearch />
							</button>
						</div>
						<div className="nav-icons">
							<a href="#account">
								<FaHeart size={20} />
								<span className="badge">{3}</span>
							</a>
							<a href="#cart">
								<FaShoppingCart size={20} />
								<span className="badge">{2}</span>
							</a>
						</div>
					</div>
					<nav className="nav-bar">
						<ul>
							<li>
								<a href="#" className="active">
									Home
								</a>
							</li>
							<li>
								<a href="#">Electronics</a>
							</li>
							<li>
								<a href="#">Clothing</a>
							</li>
							<li>
								<a href="#">Home & Kitchen</a>
							</li>
							<li>
								<a href="#">Beauty</a>
							</li>
							<li>
								<a href="#">Sports</a>
							</li>
							<li>
								<a href="#">Deals</a>
							</li>
						</ul>
					</nav>
				</div>
			</header>
			<main className="hero">
				<div className="container">
					<h1>Summer Sale is Live!</h1>
					<p>Get up to 50% off on selected items. Limited time offer.</p>
					<button>Shop Now</button>
				</div>
			</main>
			<footer className="footer">
				<div className="container">
					<div className="footer-content">
						<div className="footer-column">
							<h3>Shop</h3>
							<ul>
								<li>
									<a href="#">Electronics</a>
								</li>
								<li>
									<a href="#">Clothing</a>
								</li>
								<li>
									<a href="#">Home & Kitchen</a>
								</li>
								<li>
									<a href="#">Beauty</a>
								</li>
								<li>
									<a href="#">Sports</a>
								</li>
							</ul>
						</div>
						<div className="footer-column">
							<h3>Customer Service</h3>
							<ul>
								<li>
									<a href="#">Conctact Us</a>
								</li>
								<li>
									<a href="#">FAQs</a>
								</li>
								<li>
									<a href="#">Shipping Policy</a>
								</li>
								<li>
									<a href="#">Return Policy</a>
								</li>
							</ul>
						</div>
						<div className="footer-column">
							<h3>About Us</h3>
							<ul>
								<li>
									<a href="#">Our Story</a>
								</li>
								<li>
									<a href="#">Blog</a>
								</li>
								<li>
									<a href="#">Careers</a>
								</li>
								<li>
									<a href="#">Press</a>
								</li>
								<li>
									<a href="#">Sustainability</a>
								</li>
							</ul>
						</div>
					</div>
					<div className="copyright">
						&copy; {new Date().getFullYear()} ShopSmart. All rights reserved.
					</div>
				</div>
			</footer>
			<ChatWidget />
		</>
	);
};

export default EcommerceStore;
