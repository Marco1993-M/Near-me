body, html {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: auto; /* Changed from hidden to allow scrolling if needed */
  font-family: Arial, Helvetica, sans-serif;
}

/* Map wrapper */
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  z-index: 0;
}

#map {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.leaflet-control-zoom {
  display: none !important;
}


.custom-neumorphic-icon {
  background: none !important;
  border: none !important;
}

.neumorphic-marker {
  width: 24px;
  height: 24px;
  background: #c7f5d3;
  border-radius: 50%;
  box-shadow:
    6px 6px 10px #bebebe,
    -6px -6px 10px #ffffff;
  border: 1px solid #000000;
}

.route-label {
  font-size: 12px;
  color: #333;
  text-shadow: 0 0 2px #fff;
}

#auth-banner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(5px);
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100000;
}

.auth-banner-logo {
  display: block;
  margin: 20px auto;
  width: 100px; /* adjust the width to fit your logo */
  height: auto;
}
.auth-banner-content {
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(10px);
  background: linear-gradient(
    to bottom right,
    rgba(255, 255, 255, 0.8),
    rgba(255, 255, 255, 0.6)
  );
  max-width: 80%;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 5px 5px 10px rgba(49, 49, 49, 0.2),
              -5px -5px 10px rgba(127, 127, 127, 0.3),
              inset 3px 3px 6px rgba(183, 182, 182, 0.2),
              inset -3px -3px 6px rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: 80%;
  max-width: 400px;
}

.auth-banner-heading {
  font-size: 24px;
  font-weight: bold;
  margin: 20px 20px 20px 20px;
  text-align: left;
  color: #333;
}

.auth-banner-description {
  font-size: 12px;
  color: #666;
  margin-bottom: 45px;
  text-align: left;
}

.auth-banner-input {
  width: 85%; /* Subtract the padding and border from the width */
  padding: 14px;
  margin: 0 auto 10px auto; /* Center the input field horizontally */
  border: 0.5px solid black;
  border-radius: 5px;
  margin-bottom: 25px;
    box-shadow: inset 3px 3px 6px #ededed, inset -3px -3px 6px #ffffff;
  color: #333;
  display: block; /* Ensure the input field is a block element */
}

.auth-banner-submit-button {
  width: 75%;
  padding: 12px;
  margin: 0 auto 12px auto;
  background: #c7f5d3;
  border: 0.5px solid black;
  margin-bottom: 10px;
  border-radius: 9999px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff;
}

.google-signin-button {
  width: 75%;
  padding: 12px;
  margin: 0 auto 12px auto;
  background: linear-gradient(145deg, #ffffff, #f7f7f7);
  border: 0.5px solid black;
  margin-bottom: 30px;
  border-radius: 9999px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: inset 3px 3px 6px #d1d1d1, inset -3px -3px 6px #ffffff;
}

.google-signin-button img {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.auth-banner-toggle-text {
  font-size: 14px;
  color: #666;
  margin-top: 10px;
  text-align: center;
}

.auth-banner-toggle-text a {
  color: #337ab7;
  text-decoration: none;
}

#auth-banner.hidden {
  display: none !important;
}
/* Search container */
#search-container {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 500px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 1001; /* Ensure it's above #map */
  background: #e0e0e0; /* Neumorphic base color */
  box-shadow: 5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff; /* Neumorphic shadow */
  border-radius: 9999px; /* Match search bar's rounded shape */
  padding: 0.05rem; /* Slight padding to frame the input */
}

.custom-png-icon img {
  filter: drop-shadow(5px 5px 3px rgba(0,0,0,0.4));
  /* Or add box-shadow if you prefer: */
  /* box-shadow: 2px 4px 6px rgba(0,0,0,0.4); */
  display: block;
  width: 32px;  /* match iconSize */
  height: 32px;
  user-select: none;
  pointer-events: none; /* optional, so clicks pass through */
}


/* Search bar */
#search-bar {
  flex: 1;
  padding: 1.25rem;
  border: none; /* Remove solid border */
  border-radius: 9999px;
  font-size: 1.1rem;
  width: 100%; /* Maintain responsiveness */
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Subtle gradient for depth */
  box-shadow: inset 3px 3px 6px #d1d1d1, inset -3px -3px 6px #ffffff; /* Inset for pressed look */
  z-index: 1001;
  color: #333; /* Darker text for readability */
  transition: box-shadow 0.2s ease;
}

#search-bar:hover {
  box-shadow: inset 2px 2px 4px #d1d1d1, inset -2px -2px 4px #ffffff; /* Subtle hover effect */
}

#search-bar:focus {
  outline: none;
  box-shadow: inset 2px 2px 4px #d1d1d1, inset -2px -2px 4px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring for accessibility */
}

#search-bar::placeholder {
  color: #6b7280; /* Slightly darker for contrast, still muted */
}

/* Search Dropdown Container */
#search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: linear-gradient(145deg, #e0e0e0, #ffffff);
  border-radius: 1rem;
  border: none;
  box-shadow:
    inset 2px 2px 4px #bebebe,
    inset -2px -2px 4px #ffffff;
  z-index: 1006;
  padding: 1rem 0.75rem;
  margin-top: 0.75rem;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
  transition: all 0.3s ease;
}

/* Dropdown List Items */
#search-dropdown li {
  padding: 0.75rem 1rem;
  cursor: pointer;
  color: #333;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 1rem;         /* ← Adjust font size */
  font-weight: 100;        /* ← Semi-bold text */
  line-height: 1.75;        /* ← More space between lines */
  letter-spacing: 0.2px;   /* ← Optional: slightly spaced letters */
  background: #e0e0e0;
  border-radius: 0.75rem;
  padding: 1rem 0.75rem;
  margin: 0.25rem 0.75rem;
  transition: all 0.2s ease;
  box-shadow:
    2px 2px 5px #bebebe,
    -2px -2px 5px #ffffff;
}

/* Hover Effect for List Items */
#search-dropdown li:hover {
  background: #e0e0e0;
  box-shadow:
    inset 2px 2px 5px #bebebe,
    inset -2px -2px 5px #ffffff;
}

/* Hidden State */
#search-dropdown.hidden {
  display: none !important;
}


/* User location button */
#user-location-button {
  position: fixed;
  top: 6.5rem;
  right: 1.5rem;
  width: 3.5rem;
  height: 3.5rem;
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Subtle gradient for depth */
  border: none; /* Remove solid border */
  border-radius: 50%;
  box-shadow: 5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff; /* Neumorphic raised effect */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  transition: box-shadow 0.2s ease;
}

#user-location-button:hover {
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Subtle hover effect */
}

#user-location-button:active {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

#user-location-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring for accessibility */
}

#user-location-button svg {
  width: 1.75rem;
  height: 1.55rem;
  color: #333; /* Darker for contrast, aligns with search bar text */
}

#user-location-button:disabled svg {
  color: #6b7280; /* Muted but readable for disabled state */
}

/* Tab styling */
.tab {
  padding: 0.5rem;
  font-size: 1rem;
  color: #333; /* Darker for contrast */
  cursor: pointer;
  z-index: 1000;
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  border-radius: 0.5rem;
  border: 1px solid black;
  transition: box-shadow 0.2s ease, color 0.3s ease;
}

.tab:hover {
  color: #4b5563; /* Slightly darker for hover */
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
}

.tab.active {
  color: #c7f5d3; /* Darker for active state */
  font-weight: 600;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

.tab:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

/* Bottom navigation bar */
.fixed.bottom-0 {
  position: fixed;
  bottom: 3rem;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 400px;
  backdrop-filter: blur(55px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff, inset 3px 3px 6px #d1d1d1, inset -3px -3px 6px #ffffff; /* Outer and inner shadows for 3D effect */
  z-index: 1001;
  display: flex;
  justify-content: space-around;
  padding: 1.25rem;
  border-radius: 9999px;
  border: 1px solid black;
}

/* Individual tab styling */
.tab-bar-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.25rem;
  background: transparent; /* Keep transparent to inherit nav bar gradient */
  box-shadow: none; /* No shadow to avoid clutter */
  font-size: 1rem;
  color: #333; /* Darker for contrast */
  cursor: pointer;
  z-index: 1000;
  transition: color 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.tab-bar-button:hover {
  color: #4b5563; /* Slightly darker for hover */
  transform: scale(1.1);
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
}

.tab-bar-button.active {
  color: #4b5563; /* Darker for active state */
  font-weight: 600;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

.tab-bar-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #8d8d8d, inset -2px -2px 5px #959595, 0 0 0 0.5px #bdbdbd; /* Focus ring */
}

.tab-bar-button svg {
  width: 1.55rem;
  height: 1.5rem;
  margin-bottom: 0.125rem;
  color: #333; /* Match text color */
}

.tab-bar-button:hover svg {
  color: #4b5563; /* Match hover color */
}

.tab-bar-button.active svg {
  color: #4b5563; /* Match active color */
}

.hidden {
  display: none !important;
}

/* Specific button overrides */
#cities-button, #top-100-button, #favorites-button {
  color: #333; /* Consistent with other tabs */
}

/* Floating card */
#floating-card {
  position: fixed;
  bottom: 3rem;
  left: 50%;
  transform: translateX(-50%);
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(5px); /* Safari support */
  background: rgba(255, 255, 255, 0.15);
  border: 0.5px solid black;
  box-shadow: 5px 5px 10px rgba(209, 209, 209, 0.5),
              -5px -5px 10px rgba(255, 255, 255, 0.6),
              inset 3px 3px 6px rgba(209, 209, 209, 0.4),
              inset 3px 3px 6px rgba(209, 209, 209, 0.4);
  border-radius: 15px;
  padding: 15px;
  padding-top: 1px;
  width: 85%;
  max-width: 450px;
  box-shadow: 5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff, inset 3px 3px 6px #d1d1d1, inset -3px -3px 6px #ffffff; /* Outer and inner shadows for 3D effect */
  z-index: 1002; /* Above map and nav bar, below modals */
}

/* Close button styling */
.floating-card-close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.floating-card-close-button:hover {
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
  transform: scale(1.1);
}

.floating-card-close-button:active {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

.floating-card-close-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

.floating-card-close-button svg {
  width: 20px;
  height: 20px;
  stroke: #333; /* Darker for contrast */
}

/* Heading styling (shop name with icon) */
.floating-card-heading {
  font-size: 1.25rem; /* 20px */
  font-weight: 600;
  color: #333; /* Matches other elements for contrast */
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Info text styling (rating, address, phone, website) */
.floating-card-info {
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements for contrast */
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Action buttons container */
.floating-card-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 20px;
  gap: 0.75rem;
  padding-bottom: 0.7rem;
}

/* Action buttons */
.floating-card-action-button {
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  border: none; /* Remove solid border */
  border-radius: 10px;
  width: 70px;
  height: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #333; /* Darker for contrast */
  cursor: pointer;
  font-size: 0.7em;
  text-align: center;
  padding: 5px;
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.floating-card-action-button:hover {
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
  transform: scale(1.05);
}

.floating-card-action-button:active {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

.floating-card-action-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

.floating-card-action-button svg {
  margin-bottom: 2px;
  width: 20px;
  height: 20px;
  color: #333; /* Matches text color */
}

/* Star icon in info */
.floating-card-info .star-icon {
  width: 16px; /* Adjusted for visibility */
  height: 16px;
  color: #333; /* Matches text color */
}

/* Media queries */
@media (min-width: 640px) {
  .floating-card-actions {
    padding-bottom: 1rem;
  }
}

@media (min-width: 768px) {
  .floating-card-actions {
    padding-bottom: 0.75rem;
  }
}

/* Ensure hidden class overrides other styles */
.hidden {
  display: none !important;
}
#floating-card.hidden {
  display: none; /* or */
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
}

/* Base styling for the shop details banner */
#shop-details-banner {
  display: block;
  position: fixed;
  bottom: 3rem;
  left: 50%;
  transform: translateX(-50%);
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(5px);
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.3);
  box-shadow: 5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff, inset 3px 3px 6px #d1d1d1, inset -3px -3px 6px #ffffff;
  border-radius: 12px;
  z-index: 1005;
  padding: 15px;
  max-width: 85%;
  width: 90%;
  max-height: calc(100vh - 6rem); /* 3rem bottom spacing + 3rem top spacing */
  overflow-y: auto;
  top: 3rem; /* Prevents it from going beyond the top */
}

/* Close button styling */
.shop-details-close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.shop-details-close-button:hover {
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
  transform: scale(1.1);
}

.shop-details-close-button:active {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

.shop-details-close-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

.shop-details-close-button svg {
  width: 20px;
  height: 20px;
  stroke: #333; /* Darker for contrast */
}

/* Heading styling */
.shop-details-heading {
  font-size: 1.25rem; /* 20px */
  font-weight: 600;
  color: #333; /* Matches other elements */
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Info text styling (address, phone, website) */
.shop-details-info {
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.shop-details-info a {
  color: #4b5563; /* Darker gray for neumorphic consistency */
  text-decoration: underline;
}

/* SVG icons in info sections */
.shop-details-info svg {
  width: 16px;
  height: 16px;
  color: #333; /* Matches text color */
}

/* Ratings & Reviews section */
.shop-details-ratings-section {
  margin: 16px 0;
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Subtle gradient */
  border-radius: 8px;
  padding: 12px;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Inset for depth */
}

/* Subheading styling */
.shop-details-subheading {
  font-size: 1rem; /* 16px */
  font-weight: 500;
  color: #333; /* Matches other elements */
  margin-bottom: 8px;
}

/* Rating dots container */
.shop-details-rating-dots {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

/* Individual rating dot */
.shop-details-rating-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin: 0 2px;
  vertical-align: middle;
  background: #4b5563; /* Matches progress bar fill for consistency */
}

/* Ratings breakdown row */
.shop-details-breakdown-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

/* Breakdown category label */
.shop-details-breakdown-label {
  width: 80px;
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
}

/* Progress bar container */
.shop-details-progress-bar {
  flex: 1;
  height: 8px;
  background: #e0e0e0; /* Neumorphic base */
  border-radius: 4px;
  box-shadow: inset 2px 2px 4px #d1d1d1, inset -2px -2px 4px #ffffff; /* Inset for depth */
  overflow: hidden;
}

/* Progress bar fill */
.shop-details-progress-bar-fill {
  height: 100%;
  background: linear-gradient(145deg, #4b5563, #6b7280); /* Neumorphic gradient for fill */
  transition: width 0.3s ease;
}

/* Breakdown count */
.shop-details-breakdown-count {
  width: 30px;
  text-align: right;
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
}

/* Total reviews text */
.shop-details-total-reviews {
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
  margin-top: 8px;
}

/* Reviews section */
.shop-details-reviews-section {
  margin-top: 16px;
}

/* Reviews container */
.shop-details-reviews-container {
  overflow-x: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  max-height: 200px;
}

/* Reviews track */
.shop-details-reviews-track {
  display: flex;
  gap: 16px;
  cursor: grab;
  flex-wrap: nowrap;
}

/* Individual review card */
.shop-details-review-card {
  flex: 0 0 auto;
  width: 180px;
  padding: 12px;
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  border: none; /* Remove solid border */
  border-radius: 8px;
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  overflow-y: auto;
  max-height: 180px;
}

/* Review card text */
.shop-details-review-card p {
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
  margin-bottom: 4px;
  word-break: break-word;
}

.shop-details-review-card p strong {
  font-weight: 600;
}

/* Button container */
.shop-details-button-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-start;
}

/* Leave a review button styling */
.shop-details-leave-review-button {
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  color: #333; /* Matches other elements */
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem; /* 14px */
  cursor: pointer;
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.shop-details-leave-review-button:hover {
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
  transform: scale(1.05);
}

.shop-details-leave-review-button:active {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

.shop-details-leave-review-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

/* Action buttons container */
.shop-details-actions {
  display: flex;
  gap: 10px;
  margin: 10px 0;
}

/* Amenities section styling */
.shop-details-amenities {
  margin: 10px 0;
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
}

/* Individual amenity tag */
.shop-details-amenity {
  display: inline-block;
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  color: #333; /* Matches other elements */
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-right: 8px;
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle raised effect */
}

/* Ensure hidden class overrides other styles */
.hidden {
  display: none !important;
}

/* Base styling for the review banner */
#review-banner {
  display: block;
  position: fixed;
  bottom: 3rem;
  left: 50%;
  transform: translateX(-50%);
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(5px); /* Safari support */
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 5px 5px 10px rgba(209, 209, 209, 0.5),
              -5px -5px 10px rgba(255, 255, 255, 0.6),
              inset 3px 3px 6px rgba(209, 209, 209, 0.4),
              inset -3px -3px 6px rgba(255, 255, 255, 0.5);
  padding: 1.25rem;
  border-radius: 8px;
  box-shadow: 5px 5px 10px #d1d1d1, -5px -5px 10px #ffffff, inset 3px 3px 6px #d1d1d1, inset -3px -3px 6px #ffffff; /* Outer and inner shadows for 3D effect */
  z-index: 1005; /* Matches shop-details-banner */
  max-width: 85%;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

/* Close button styling */
.review-banner-close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.review-banner-close-button:hover {
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
  transform: scale(1.1);
}

.review-banner-close-button:active {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

.review-banner-close-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

.review-banner-close-button svg {
  width: 20px;
  height: 20px;
  stroke: #333; /* Darker for contrast */
}

/* Heading styling */
.review-banner-heading {
  font-size: 1.25rem; /* 20px */
  font-weight: 600;
  color: #333; /* Matches other elements */
  margin-bottom: 8px;
}

/* Instruction text styling */
.review-banner-instruction {
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
  margin-bottom: 12px;
}

/* Rating container styling */
.review-banner-rating-container {
  margin: 12px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Rating button styling */
.review-banner-rating-button {
  width: 1.75rem;
  height: 1.75rem;
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  border: none; /* Remove solid border */
  border-radius: 50%; /* Circular for neumorphic look */
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
  cursor: pointer;
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  transition: box-shadow 0.2s ease, color 0.2s ease;
}

.review-banner-rating-button:hover {
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
  color: #4b5563; /* Darker for hover */
}

.review-banner-rating-button.selected {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
  color: #d1d1d1; /* Matches hover for consistency */
  background-color: #c7f5d3;
}

.review-banner-rating-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

/* Textarea styling */
.review-banner-textarea {
  width: 90%;
  height: 7rem;
  padding: 12px;
  background: #e0e0e0; /* Neumorphic base */
  border: none; /* Remove solid border */
  border-radius: 8px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
  resize: none;
  margin-top: 12px;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Inset for depth */
  transition: box-shadow 0.2s ease;
}

.review-banner-textarea:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

/* Checkbox container styling */
.review-banner-checkbox-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-top: 16px;
}

/* Checkbox label styling */
.review-banner-checkbox-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem; /* 14px */
  color: #333; /* Matches other elements */
}

/* Checkbox input styling */
.review-banner-checkbox {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  accent-color: #4b5563; /* Matches neumorphic hover/active color */
}

/* Action buttons container styling */
.review-banner-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  gap: 12px;
}

/* Cancel button styling */
.review-banner-cancel-button {
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  color: #333; /* Matches other elements */
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem; /* 14px */
  cursor: pointer;
  flex: 1;
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.review-banner-cancel-button:hover {
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
  transform: scale(1.05);
}

.review-banner-cancel-button:active {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

.review-banner-cancel-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

/* Submit button styling */
.review-banner-submit-button {
  background: linear-gradient(145deg, #e0e0e0, #ffffff); /* Neumorphic gradient */
  color: #333; /* Matches other elements */
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem; /* 14px */
  cursor: pointer;
  flex: 1;
  box-shadow: 3px 3px 6px #d1d1d1, -3px -3px 6px #ffffff; /* Raised effect */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.review-banner-submit-button:hover {
  box-shadow: 2px 2px 4px #d1d1d1, -2px -2px 4px #ffffff; /* Subtle hover effect */
  transform: scale(1.05);
}

.review-banner-submit-button:active {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff; /* Pressed effect */
}

.review-banner-submit-button:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0; /* Focus ring */
}

/* Ensure hidden class overrides other styles */
.hidden {
  display: none !important;
}

/* The entire modal container */
#cities {
  position: fixed !important; /* Ensure fixed positioning */
  bottom: env(safe-area-inset-bottom, 0); /* Respect iOS safe area */
  left: 50%;
  transform: translateX(-50%);
  width: min(96%, 1200px); /* Match #cities, #top100 */
  height: clamp(60vh, 60vh, 60vh); /* Consistent height */
  padding: clamp(0.75rem, 2vw, 1rem); /* Match #cities */
  border-radius: 12px 12px 0 0; /* Match #cities, #top100 */
  border: 0.5px solid rgb(0, 0, 0);
  background: white;
  box-shadow: 
    0 8px 32px rgba(31, 38, 135, 0.2),
    inset 0 4px 20px rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(2px) saturate(180%);
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 2vw, 0.75rem);
  z-index: 1009;
  box-sizing: border-box;
  overflow-y: auto;
}

#cities::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1); /* Secondary glassy layer */
  border-radius: 12px 12px 0 0; /* Match parent radius */
  backdrop-filter: blur(3px); /* Subtle blur for depth */
  -webkit-backdrop-filter: blur(1px);
  box-shadow: 
    inset -10px -8px 0px -11px rgba(255, 255, 255, 1), /* Inset highlight */
    inset 0px -9px 0px -8px rgba(255, 255, 255, 1); /* Inset highlight */
  opacity: 0.6;
  z-index: -1; /* Behind content */
  filter: blur(4px) drop-shadow(10px 4px 6px black) brightness(115%); /* Depth effect */
}


/* Smaller screens (e.g., iPhone 12, ~390px) */
@media (max-width: 480px) {
  #cities {
    width: calc(100% - env(safe-area-inset-left, 0) - env(safe-area-inset-right, 0)); /* Full width minus safe areas */
    height: clamp(60vh, 60vh, 60vh); /* Shorter height */
    padding: clamp(1rem, 2vw, 1rem); /* Minimal padding */
    border-radius: 8px 8px 0 0; /* Smaller radius */
    gap: 0.5rem;
    backdrop-filter: blur(1px) saturate(150%); /* Lighter blur for performance */
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  #cities::after {
    border-radius: 8px 8px 0 0; /* Match parent */
    backdrop-filter: none; /* Disable secondary blur on mobile */
    -webkit-backdrop-filter: none;
    filter: blur(0.5px) drop-shadow(5px 2px 3px black) brightness(110%); /* Reduced effects */
  }
}

/* Medium screens (e.g., tablets) */
@media (min-width: 481px) and (max-width: 768px) {
  #cities {
    width: 95%; /* Slightly narrower */
    height: clamp(60vh, 60vh, 60vh); /* Balanced height */
    padding: clamp(1rem, 2vw, 1rem);
    border-radius: 8px 8px 0 0;
  }
  #cities::after {
    border-radius: 8px 8px 0 0; /* Match parent */
  }
}

/* Larger screens (e.g., desktop) */
@media (min-width: 1200px) {
  #cities {
    width: 80%; /* Narrower for large screens */
    max-width: 1400px;
    height: clamp(60vh, 60vh, 60vh);
    padding: 1.5rem;
  }
}

.cities-modal-heading {
  font-size: clamp(1.5rem, 5vw, 2rem); /* 24px-32px */
  color: #c7f5d3; /* White for contrast */
   -webkit-text-stroke: 0.5px rgba(0, 0, 0, 0.7); /* Stroke */
  text-shadow: 
    0 1px 2px rgba(31, 38, 135, 0.3), /* Glassy glow */
    0 1px 2px rgba(0, 0, 0, 0.4); /* Depth */
  font-weight: 600; /* Semi-bold */
  margin: 2rem 0 0.5rem; /* Extra top margin to avoid close button */
  padding: 0 clamp(0.5rem, 2vw, 0.75rem); /* Align with #cities */
  padding-bottom: 12px;
  text-align: left;
  transition: text-shadow 0.2s ease, transform 0.2s ease; /* Smooth effects */
}


/* Smaller screens (e.g., iPhone 12, ~390px) */
@media (max-width: 480px) {
  .cities-heading {
    font-size: clamp(1.25rem, 4vw, 1.5rem); /* 20px-24px */
    text-shadow: 
      0 1px 2px rgba(31, 38, 135, 0.3),
      0 1px 1px rgba(0, 0, 0, 0.3); /* Lighter shadow */
    margin: 1.5rem 0 0.5rem; /* Smaller top margin */
    padding: 0 0.5rem;
  }
}

/* Larger screens (e.g., desktop) */
@media (min-width: 1200px) {
  .cities-heading {
    font-size: clamp(1.75rem, 4vw, 2.25rem); /* 28px-36px */
    margin: 2.5rem 0 1rem;
  }
}

.cities-modal-sub-heading {
  font-size: clamp(1rem, 5vw, 1rem); /* 24px-32px */
  font-weight: 100;
  color: #000000; /* White for contrast */
   -webkit-text-stroke: 0.2px rgba(0, 0, 0, 0.7); /* Stroke */
  margin: 0.12rem 0 0.5rem; /* Extra top margin to avoid close button */
  padding: 0 clamp(0.5rem, 2vw, 0.75rem); /* Align with #cities */
  padding-bottom: 12px;
  text-align: left;
  transition: text-shadow 0.2s ease, transform 0.2s ease; /* Smooth effects */
}


/* Smaller screens (e.g., iPhone 12, ~390px) */
@media (max-width: 480px) {
  .cities-sub-heading {
    font-size: clamp(1.25rem, 4vw, 1.5rem); /* 20px-24px */
    text-shadow: 
      0 1px 2px rgba(31, 38, 135, 0.3),
      0 1px 1px rgba(0, 0, 0, 0.3); /* Lighter shadow */
    margin: 1.5rem 0 0.5rem; /* Smaller top margin */
    padding: 0 0.5rem;
  }
}

/* Larger screens (e.g., desktop) */
@media (min-width: 1200px) {
  .cities-sub-heading {
    font-size: clamp(1.75rem, 4vw, 2.25rem); /* 28px-36px */
    margin: 2.5rem 0 1rem;
  }
}

/* Close button in modal */
.close-cities-modal {
  position: absolute;
  top: clamp(0.5rem, 2vw, 0.75rem); /* Match #cities padding */
  right: clamp(0.5rem, 2vw, 0.75rem); /* Match #cities padding */
  border: 0.5px solid rgb(125, 125, 125);
  padding: 0.5rem; /* Slightly larger padding */
  cursor: pointer;
  transition: transform 0.2s;
  background: rgba(255, 255, 255, 0.15); /* Glassy background */
  box-shadow: 
    0 4px 16px rgba(31, 38, 135, 0.2), /* Smaller outer shadow */
    inset 0 2px 10px rgba(255, 255, 255, 0.3); /* Inner glow */
  backdrop-filter: blur(2px) saturate(180%); /* Glass effect */
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  border-radius: 50%; /* Circular button */
  font-size: 1.2rem; /* Larger "X" (24px) */
  line-height: 1; /* Center text */
  color: #000000; /* White "X" for contrast */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem; /* Fixed size for consistency */
  height: 2rem;
  z-index: 1010; /* Above #cities and #city-buttons */
}

.close-cities-modal:hover {
  transform: scale(1.1); /* Slight grow on hover */
}

/* Smaller screens (e.g., iPhone 12, ~390px) */
@media (max-width: 480px) {
  .close-cities-modal {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.4rem;
    font-size: 1.25rem; /* Slightly smaller (20px) */
    width: 1.75rem;
    height: 1.75rem;
    backdrop-filter: blur(1px) saturate(150%); /* Lighter blur */
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
}

.close-cities-modal:hover {
  transform: scale(1.1);
}

.close-cities-modal:active {
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff;
}

.close-cities-modal:focus {
  outline: none;
  box-shadow: inset 2px 2px 5px #d1d1d1, inset -2px -2px 5px #ffffff, 0 0 0 2px #b0b0b0;
}

/* Container for city buttons and search input inside modal */
#city-buttons {
  width: 100%;
  padding: 0; /* Remove padding since #cities already has */
  background: transparent; /* No background here */
  border-radius: 0;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative; /* To contain absolutely positioned children like suggestions */
  box-sizing: border-box;
}

/* Search input field styling */
.city-search-input {
  width: 100%;
  padding: 0.5rem 0.75rem; /* Matches original 8px 12px */
  border: 0.5px solid black;
  background: rgba(255, 255, 255, 0.15); /* Glassy background */
  border-radius: 8px; /* Keep original shape */
  font-size: 1rem; /* Slightly larger for consistency (16px) */
  color: #000000; /* White text for contrast */
  backdrop-filter: blur(2px) saturate(180%); /* Glass effect */
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative; /* For suggestions */
  z-index: 1010; /* Above other elements */
}

.city-search-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.9); /* Brighter border */
  box-shadow: 
    0 6px 20px rgba(31, 38, 135, 0.25), /* Stronger outer shadow */
    inset 0 2px 10px rgba(255, 255, 255, 0.3),
    0 0 0 2px rgba(255, 255, 255, 0.9); /* Glassy focus ring */
}

/* Smaller screens (e.g., iPhone 12, ~390px) */
@media (max-width: 480px) {
  .city-search-input {
    padding: 0.4rem 0.6rem; /* Slightly smaller */
    font-size: 0.875rem; /* Original size (14px) for mobile */
    border-radius: 6px; /* Smaller radius */
    backdrop-filter: blur(1px) saturate(150%); /* Lighter blur */
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  .city-search-input:focus {
    box-shadow: 
      0 4px 12px rgba(31, 38, 135, 0.2),
      inset 0 2px 8px rgba(255, 255, 255, 0.3),
      0 0 0 1.5px rgba(255, 255, 255, 0.9);
  }
}

/* Suggestions dropdown */
.city-suggestions {
  position: absolute;
  top: calc(100% + 4px); /* Just below search input with margin */
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  box-shadow:
    3px 3px 6px rgba(209, 209, 209, 0.3),
    -3px -3px 6px rgba(255, 255, 255, 0.4);
  z-index: 10000;
  box-sizing: border-box;
}

/* Each suggestion item */
.city-suggestion-item {
  background: linear-gradient(145deg, #e0e0e0, #ffffff);
  color: #333;
  padding: 8px 12px;
  font-size: 0.875rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
  border-radius: 0;
  width: 100%;
  box-sizing: border-box;
}

.city-suggestion-item:hover {
  background: linear-gradient(145deg, #d1d1d1, #f0f0f0);
}

/* Search button style */
.cities-search-button {
  background: rgba(255, 255, 255, 0.15); /* Glassy background */
  border: 0.5px solid black;
  box-shadow: 
    0 2px 1px rgba(31, 38, 135, 0.2), /* Outer shadow */
    inset 0 2px 10px rgba(255, 255, 255, 0.3); /* Inner glow */
  backdrop-filter: blur(2px) saturate(180%); /* Glass effect */
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  border-radius: 8px; /* Keep original shape */
  padding: 0.70rem 2.25rem; /* Slightly larger than original */
  margin-top: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  align-self: flex-start; /* Align left */
  font-size: 0.75rem; /* Larger text (20px) */
  color: #000000; /* White text for contrast */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1; /* Above potential parent ::after */
}

.cities-search-button:hover {
  box-shadow: 
    0 6px 20px rgba(31, 38, 135, 0.25), /* Slightly stronger shadow */
    inset 0 3px 12px rgba(255, 255, 255, 0.35);
  transform: scale(1.05); /* Keep original hover effect */
}

.cities-search-button:active {
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3), /* Inset for pressed effect */
    inset -2px -2px 5px rgba(255, 255, 255, 0.4);
  transform: scale(1); /* Reset scale */
}

.cities-search-button:focus {
  outline: none;
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3),
    inset -2px -2px 5px rgba(255, 255, 255, 0.4),
    0 0 0 2px rgba(255, 255, 255, 0.9); /* Glassy focus ring */
}

/* Smaller screens (e.g., iPhone 12, ~390px) */
@media (max-width: 480px) {
  .cities-search-button {
    padding: 0.5rem 1rem; /* Smaller padding */
    font-size: 1rem; /* Smaller text (16px) */
    border-radius: 6px; /* Slightly smaller radius */
    backdrop-filter: blur(1px) saturate(150%); /* Lighter blur */
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  .cities-search-button:hover {
    box-shadow: 
      0 4px 12px rgba(31, 38, 135, 0.2),
      inset 0 2px 8px rgba(255, 255, 255, 0.3);
  }
  .cities-search-button:active {
    box-shadow: 
      inset 1px 1px 3px rgba(31, 38, 135, 0.3),
      inset -1px -1px 3px rgba(255, 255, 255, 0.4);
  }
  .cities-search-button:focus {
    box-shadow: 
      inset 1px 1px 3px rgba(31, 38, 135, 0.3),
      inset -1px -1px 3px rgba(255, 255, 255, 0.4),
      0 0 0 1.5px rgba(255, 255, 255, 0.9);
  }
}

/* Shop results container */
.shop-results {
  max-height: 300px;
  overflow-y: auto;
  background: transparent; /* No background to keep consistent */
  padding-right: 8px; /* for scrollbar spacing */
  box-sizing: border-box;
  border-radius: 0;
}

/* Shop results list */
.cities-modal-shops-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Enhanced glassmorphism effect for the Top 100 modal */
#top100 {
  position: fixed;
  bottom: env(safe-area-inset-bottom, 0); /* Respect iOS safe area */
  left: 50%;
  transform: translateX(-50%);
  width: min(96%, 1200px); /* Match #cities, #top100 */
  height: clamp(60vh, 60vh, 60vh); /* Consistent height */
  padding: clamp(0.75rem, 2vw, 1rem); /* Match #cities */
  border-radius: 12px 12px 0 0; /* Match #cities, #top100 */
  border: 0.5px solid rgb(0, 0, 0);
  background: white;
  box-shadow: 
    0 8px 32px rgba(31, 38, 135, 0.2),
    inset 0 4px 20px rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(2px) saturate(180%);
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 2vw, 0.75rem);
  z-index: 1009;
  box-sizing: border-box;
  overflow-y: auto;
}

#top100::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1); /* Secondary glassy layer */
  border-radius: 12px 12px 0 0; /* Match parent radius */
  backdrop-filter: blur(3px); /* Subtle blur for depth */
  -webkit-backdrop-filter: blur(1px);
  box-shadow: 
    inset -10px -8px 0px -11px rgba(255, 255, 255, 1), /* Inset highlight */
    inset 0px -9px 0px -8px rgba(255, 255, 255, 1); /* Inset highlight */
  opacity: 0.6;
  z-index: -1; /* Behind content */
  filter: blur(4px) drop-shadow(10px 4px 6px black) brightness(115%); /* Depth effect */
}

/* Ensure dialog respects fixed positioning */
dialog#top100[open] {
  position: fixed;
  bottom: env(safe-area-inset-bottom, 0);
  top: auto; /* Prevent stretching */
}

dialog#top100:not([open]) {
  display: none;
}


/* Close button styling */
.top100-modal-close-button {
  position: absolute;
  top: clamp(0.5rem, 2vw, 0.75rem); /* Match #cities padding */
  right: clamp(0.5rem, 2vw, 0.75rem); /* Match #cities padding */
  border: 0.5px solid rgb(125, 125, 125);
  padding: 0.5rem; /* Slightly larger padding */
  cursor: pointer;
  transition: transform 0.2s;
  background: rgba(255, 255, 255, 0.15); /* Glassy background */
  box-shadow: 
    0 4px 16px rgba(31, 38, 135, 0.2), /* Smaller outer shadow */
    inset 0 2px 10px rgba(255, 255, 255, 0.3); /* Inner glow */
  backdrop-filter: blur(2px) saturate(180%); /* Glass effect */
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  border-radius: 50%; /* Circular button */
  font-size: 1.2rem; /* Larger "X" (24px) */
  line-height: 1; /* Center text */
  color: #000000; /* White "X" for contrast */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem; /* Fixed size for consistency */
  height: 2rem;
  z-index: 1010; /* Above #cities and #city-buttons */
}

.top100-modal-close-button:hover {
  box-shadow: 
    0 6px 20px rgba(31, 38, 135, 0.25),
    inset 0 3px 12px rgba(255, 255, 255, 0.35);
  transform: scale(1.1);
}

.top100-modal-close-button:active {
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3),
    inset -2px -2px 5px rgba(255, 255, 255, 0.4);
}

.top100-modal-close-button:focus {
  outline: none;
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3),
    inset -2px -2px 5px rgba(255, 255, 255, 0.4),
    0 0 0 2px rgba(255, 255, 255, 0.9);
}

.top100-modal-close-button svg {
  width: 1.5rem; /* Larger to match .close-cities-modal */
  height: 1.5rem;
  stroke: #fff; /* White for contrast */
  stroke-width: 3;
}

/* Heading styling */
.top100-modal-heading {
  font-size: clamp(1.5rem, 5vw, 2rem); /* 24px-32px */
  color: #c7f5d3; /* White for contrast */
   -webkit-text-stroke: 0.2px rgba(0, 0, 0, 0.7); /* Stroke */
  text-shadow: 
    0 1px 2px rgba(31, 38, 135, 0.3), /* Glassy glow */
    0 1px 2px rgba(0, 0, 0, 0.4); /* Depth */
  font-weight: 600; /* Semi-bold */
  margin: 2rem 0 0.5rem; /* Extra top margin to avoid close button */
  padding: 0 clamp(0.5rem, 2vw, 0.75rem); /* Align with #cities */
  text-align: left; /* Centered title */
  transition: text-shadow 0.2s ease, transform 0.2s ease; /* Smooth effects */
}

/* Sub-Heading styling */
.top100-modal-sub-heading {
  font-size: clamp(1rem, 5vw, 1rem); /* 24px-32px */
  font-weight: 100;
  color: #000000; /* White for contrast */
   -webkit-text-stroke: 0.2px rgba(0, 0, 0, 0.7); /* Stroke */
  margin: 0.12rem 0 0.5rem; /* Extra top margin to avoid close button */
  padding: 0 clamp(0.5rem, 2vw, 0.75rem); /* Align with #cities */
  padding-bottom: 12px;
  text-align: left;
  transition: text-shadow 0.2s ease, transform 0.2s ease; /* Smooth effects */
}


/* List container */
.top100-modal-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: clamp(300px, 55vh, 350px); /* Responsive height */
  overflow-y: auto;
}

/* List item styling */
.top100-modal-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 95%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 1px 2px rgba(31, 38, 135, 0.2),
    inset 0 2px 10px rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(2px) saturate(180%);
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  border-radius: 8px;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.top100-modal-list-item:hover {
  box-shadow: 
    0 6px 20px rgba(31, 38, 135, 0.25),
    inset 0 3px 12px rgba(255, 255, 255, 0.35);
  transform: scale(1.01);
}

/* Shop name and rating container */
.top100-modal-shop-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #000000; /* White for contrast */
}

/* Star icon */
.top100-modal-star-icon {
  width: 1rem;
  height: 1rem;
  stroke: #000000; /* White for contrast */
  fill: none;
}

/* Action buttons container */
.top100-modal-actions {
  display: flex;
  gap: 0.5rem;
}

/* View and Favorite buttons */
.top100-modal-button {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 4px 16px rgba(31, 38, 135, 0.2),
    inset 0 2px 10px rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(2px) saturate(180%);
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  border-radius: 50%;
  padding: 0.4rem;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
}

.top100-modal-button:hover {
  box-shadow: 
    0 6px 20px rgba(31, 38, 135, 0.25),
    inset 0 3px 12px rgba(255, 255, 255, 0.35);
  transform: scale(1.1);
}

.top100-modal-button:active {
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3),
    inset -2px -2px 5px rgba(255, 255, 255, 0.4);
}

.top100-modal-button:focus {
  outline: none;
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3),
    inset -2px -2px 5px rgba(255, 255, 255, 0.4),
    0 0 0 2px rgba(255, 255, 255, 0.9);
}

.top100-modal-button svg {
  width: 1rem;
  height: 1rem;
  stroke: #000000; /* White for contrast */
}

.top100-modal-button.favorited svg {
  fill: #fff; /* White when favorited */
}

/* Hidden class */
.hidden {
  display: none !important;
}

/* Smaller screens (e.g., iPhone 12, ~390px) */
@media (max-width: 480px) {
  #top100 {
    width: calc(100% - env(safe-area-inset-left, 0) - env(safe-area-inset-right, 0));
    height: clamp(35vh, 45vh, 50vh);
    padding: clamp(0.5rem, 2vw, 0.75rem);
    border-radius: 8px 8px 0 0;
    backdrop-filter: blur(1px) saturate(150%);
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  #top100::after {
    border-radius: 8px 8px 0 0;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    filter: blur(0.5px) drop-shadow(5px 2px 3px black) brightness(110%);
  }
  .top100-modal-close-button {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.4rem;
    width: 1.75rem;
    height: 1.75rem;
    backdrop-filter: blur(1px) saturate(150%);
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  .top100-modal-close-button svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2.5;
  }
  .top100-modal-heading {
  font-size: clamp(1.5rem, 5vw, 2rem); /* 24px-32px */
  color: #c7f5d3; /* White for contrast */
   -webkit-text-stroke: 0.2px rgba(0, 0, 0, 0.7); /* Stroke */
  text-shadow: 
    0 1px 2px rgba(31, 38, 135, 0.3), /* Glassy glow */
    0 1px 2px rgba(0, 0, 0, 0.4); /* Depth */
  font-weight: 600; /* Semi-bold */
  margin: 2rem 0 0.5rem; /* Extra top margin to avoid close button */
  padding: 0 clamp(0.5rem, 2vw, 0.75rem); /* Align with #cities */
  text-align: left; /* Centered title */
  transition: text-shadow 0.2s ease, transform 0.2s ease; /* Smooth effects */
}

  .top100-modal-list {
    max-height: clamp(150px, 30vh, 200px);
  }
  .top100-modal-list-item {
    padding: 0.4rem;
    margin-bottom: 0.4rem;
    border-radius: 6px;
    backdrop-filter: blur(1px) saturate(150%);
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  .top100-modal-list-item:hover {
    box-shadow: 
      0 4px 12px rgba(31, 38, 135, 0.2),
      inset 0 2px 8px rgba(255, 255, 255, 0.3);
  }
  .top100-modal-button {
    padding: 0.3rem;
    width: 1.5rem;
    height: 1.5rem;
    backdrop-filter: blur(1px) saturate(150%);
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  .top100-modal-button svg {
    width: 0.875rem;
    height: 0.875rem;
  }
}

/* Medium screens (e.g., tablets) */
@media (min-width: 481px) and (max-width: 768px) {
  #top100 {
    width: 100%;
    height: clamp(60vh, 60vh, 60vh);
    padding: clamp(0.75rem, 2vw, 1rem);
    border-radius: 8px 8px 0 0;
  }
  #top100::after {
    border-radius: 8px 8px 0 0;
  }
}

/* Larger screens (e.g., desktop) */
@media (min-width: 1200px) {
  #top100 {
    width: 80%;
    max-width: 1400px;
    height: clamp(60vh, 60vh, 60vh);
    padding: 1.5rem;
  }
  .top100-modal-heading {
    font-size: clamp(1.75rem, 4vw, 2.25rem);
    -webkit-text-stroke: 0.6px rgba(31, 38, 135, 0.7);
    margin: 2.5rem 0 1rem;
  }
}

/* Base styling for the favorites modal */
#favorites {
 position: fixed !important; /* Ensure fixed positioning */
  bottom: env(safe-area-inset-bottom, 0); /* Respect iOS safe area */
  left: 50%;
  transform: translateX(-50%);
  width: min(96%, 1200px); /* Match #cities, #top100 */
  height: clamp(60vh, 60vh, 60vh); /* Consistent height */
  padding: clamp(0.75rem, 2vw, 1rem); /* Match #cities */
  border-radius: 12px 12px 0 0; /* Match #cities, #top100 */
  border: 0.5px solid rgb(0, 0, 0);
  background: white;
  box-shadow: 
    0 8px 32px rgba(31, 38, 135, 0.2),
    inset 0 4px 20px rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(2px) saturate(180%);
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  display: flex;
  flex-direction: column;
  gap: clamp(0.5rem, 2vw, 0.75rem);
  z-index: 1009;
  box-sizing: border-box;
  overflow-y: auto;
}

#favorites::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px 12px 0 0;
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(1px);
  box-shadow: 
    inset -10px -8px 0px -11px rgba(255, 255, 255, 1),
    inset 0px -9px 0px -8px rgba(255, 255, 255, 1);
  opacity: 0.6;
  z-index: -1;
  filter: blur(1px) drop-shadow(10px 4px 6px black) brightness(115%);
}

dialog#favorites[open] {
  position: fixed;
  bottom: env(safe-area-inset-bottom, 0);
  top: auto;
}

/* Close button styling */
.favorite-modal-close-button {
  position: absolute;
  top: clamp(0.5rem, 2vw, 0.75rem); /* Match #cities padding */
  right: clamp(0.5rem, 2vw, 0.75rem); /* Match #cities padding */
  border: 0.5px solid rgb(125, 125, 125);
  padding: 0.5rem; /* Slightly larger padding */
  cursor: pointer;
  transition: transform 0.2s;
  background: rgba(255, 255, 255, 0.15); /* Glassy background */
  box-shadow: 
    0 4px 16px rgba(31, 38, 135, 0.2), /* Smaller outer shadow */
    inset 0 2px 10px rgba(255, 255, 255, 0.3); /* Inner glow */
  backdrop-filter: blur(2px) saturate(180%); /* Glass effect */
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  border-radius: 50%; /* Circular button */
  font-size: 1.2rem; /* Larger "X" (24px) */
  line-height: 1; /* Center text */
  color: #000000; /* White "X" for contrast */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem; /* Fixed size for consistency */
  height: 2rem;
  z-index: 1010; /* Above #cities and #city-buttons */
}

.favorite-modal-close-button:hover {
  box-shadow: 
    0 6px 20px rgba(31, 38, 135, 0.25),
    inset 0 3px 12px rgba(255, 255, 255, 0.35);
  transform: scale(1.1);
}

.favorite-modal-close-button:active {
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3),
    inset -2px -2px 5px rgba(255, 255, 255, 0.4);
}

.favorite-modal-close-button:focus {
  outline: none;
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3),
    inset -2px -2px 5px rgba(255, 255, 255, 0.4),
    0 0 0 2px rgba(255, 255, 255, 0.9);
}

.favorite-modal-close-button svg {
  width: 1.5rem; /* Match .close-cities-modal */
  height: 1.5rem;
  stroke: #fff; /* White for contrast */
  stroke-width: 3;
}

/* Heading styling */
.favorite-modal-heading {
  font-size: clamp(1.5rem, 5vw, 2rem); /* 24px-32px */
  color: #c7f5d3; /* White for contrast */
   -webkit-text-stroke: 0.5px rgba(0, 0, 0, 0.7); /* Stroke */
  text-shadow: 
    0 1px 2px rgba(31, 38, 135, 0.3), /* Glassy glow */
    0 1px 2px rgba(0, 0, 0, 0.4); /* Depth */
  font-weight: 600; /* Semi-bold */
  margin: 2rem 0 0.5rem; /* Extra top margin to avoid close button */
  padding: 0 clamp(0.5rem, 2vw, 0.75rem); /* Align with #cities */
  padding-bottom: 12px;
  text-align: left;
  transition: text-shadow 0.2s ease, transform 0.2s ease; /* Smooth effects */
}

.favorite-modal-sub-heading {
  font-size: clamp(1rem, 5vw, 1rem); /* 24px-32px */
  font-weight: 100;
  color: #000000; /* White for contrast */
   -webkit-text-stroke: 0.2px rgba(0, 0, 0, 0.7); /* Stroke */
  margin: 0.12rem 0 0.5rem; /* Extra top margin to avoid close button */
  padding: 0 clamp(0.5rem, 2vw, 0.75rem); /* Align with #cities */
  padding-bottom: 12px;
  text-align: left;
  transition: text-shadow 0.2s ease, transform 0.2s ease; /* Smooth effects */
}


/* Smaller screens (e.g., iPhone 12, ~390px) */
@media (max-width: 480px) {
  .favorite-sub-heading {
    font-size: clamp(1.25rem, 4vw, 1.5rem); /* 20px-24px */
    text-shadow: 
      0 1px 2px rgba(31, 38, 135, 0.3),
      0 1px 1px rgba(0, 0, 0, 0.3); /* Lighter shadow */
    margin: 1.5rem 0 0.5rem; /* Smaller top margin */
    padding: 0 0.5rem;
  }
}

/* Larger screens (e.g., desktop) */
@media (min-width: 1200px) {
  .favorite-sub-heading {
    font-size: clamp(1.75rem, 4vw, 2.25rem); /* 28px-36px */
    margin: 2.5rem 0 1rem;
  }
}

/* List container */
.favorite-modal-list {
  list-style: none;
  padding: 0 0 0 1rem;
  margin: 0;
  border: 0.5px solid rgb(185, 185, 185) ; /* Glassy border */
  border-radius: 12px;
  max-height: clamp(200px, 40vh, 300px); /* Responsive height */
  overflow-y: auto;
}

/* List item styling */
.favorite-modal-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid black ; /* Glassy border */
  box-shadow: 
    0 4px 16px rgba(31, 38, 135, 0.2),
    inset 0 2px 10px rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(2px) saturate(180%);
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  border-radius: 8px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.favorite-modal-list-item:hover {
  box-shadow: 
    0 6px 20px rgba(31, 38, 135, 0.25),
    inset 0 3px 12px rgba(255, 255, 255, 0.35);
  transform: scale(1.02);
}

/* Favorite item styling */
.favorite-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.8); /* Glassy border */
  padding: 0.5rem 0;
  margin: 0.5rem 0;
}

.favorite-item h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #fff; /* White for contrast */
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); /* Enhance legibility */
}

.favorite-item p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9); /* Slightly transparent white */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Shop name container */
.favorite-modal-shop-info {
  font-size: 0.875rem;
  color: #fff; /* White for contrast */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Action buttons container */
.favorite-modal-actions {
  display: flex;
  gap: 0.5rem;
}

/* View and Remove buttons */
.favorite-modal-button {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 4px 16px rgba(31, 38, 135, 0.2),
    inset 0 2px 10px rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(2px) saturate(180%);
  -webkit-backdrop-filter: blur(2px) saturate(180%);
  border-radius: 50%;
  padding: 0.4rem;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
}

.favorite-modal-button:hover {
  box-shadow: 
    0 6px 20px rgba(31, 38, 135, 0.25),
    inset 0 3px 12px rgba(255, 255, 255, 0.35);
  transform: scale(1.1);
}

.favorite-modal-button:active {
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3),
    inset -2px -2px 5px rgba(255, 255, 255, 0.4);
}

.favorite-modal-button:focus {
  outline: none;
  box-shadow: 
    inset 2px 2px 5px rgba(31, 38, 135, 0.3),
    inset -2px -2px 5px rgba(255, 255, 255, 0.4),
    0 0 0 2px rgba(255, 255, 255, 0.9);
}

.favorite-modal-button svg {
  width: 1rem;
  height: 1rem;
  stroke: #fff;
}

.favorite-modal-button.remove svg {
  stroke: #ff4d4f; /* Red for remove icon */
}

/* Hidden class */
.hidden {
  display: none !important;
}

/* Smaller screens (e.g., iPhone 12, ~390px) */
@media (max-width: 480px) {
  #favorites {
    width: calc(100% - env(safe-area-inset-left, 0) - env(safe-area-inset-right, 0));
    height: clamp(60vh, 60vh, 60vh);
    padding: clamp(0.5rem, 2vw, 0.75rem);
    border-radius: 8px 8px 0 0;
    backdrop-filter: blur(1px) saturate(150%);
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  #favorites::after {
    border-radius: 8px 8px 0 0;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    filter: blur(0.5px) drop-shadow(5px 2px 3px black) brightness(110%);
  }
  .favorite-modal-close-button {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.4rem;
    width: 1.75rem;
    height: 1.75rem;
    backdrop-filter: blur(1px) saturate(150%);
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  .favorite-modal-close-button svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke-width: 2.5;
  }
  .favorite-modal-heading {
    font-size: clamp(1.25rem, 4vw, 1.5rem);
    -webkit-text-stroke: 0.3px rgba(31, 38, 135, 0.7);
    text-shadow: 
      0 1px 2px rgba(31, 38, 135, 0.3),
      0 1px 1px rgba(0, 0, 0, 0.3),
      -0.5px -0.5px 0 rgba(31, 38, 135, 0.7),
      0.5px -0.5px 0 rgba(31, 38, 135, 0.7),
      -0.5px 0.5px 0 rgba(31, 38, 135, 0.7),
      0.5px 0.5px 0 rgba(31, 38, 135, 0.7);
    margin: 1.5rem 0 0.5rem;
    padding: 0 0.5rem;
  }
  .favorite-modal-list {
    max-height: clamp(150px, 30vh, 200px);
  }
  .favorite-modal-list-item {
    padding: 0.4rem;
    margin-bottom: 0.4rem;
    border-radius: 6px;
    backdrop-filter: blur(1px) saturate(150%);
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  .favorite-modal-list-item:hover {
    box-shadow: 
      0 4px 12px rgba(31, 38, 135, 0.2),
      inset 0 2px 8px rgba(255, 255, 255, 0.3);
  }
  .favorite-modal-button {
    padding: 0.3rem;
    width: 1.5rem;
    height: 1.5rem;
    backdrop-filter: blur(1px) saturate(150%);
    -webkit-backdrop-filter: blur(1px) saturate(150%);
  }
  .favorite-modal-button svg {
    width: 0.875rem;
    height: 0.875rem;
  }
}

/* Medium screens (e.g., tablets) */
@media (min-width: 481px) and (max-width: 768px) {
  #favorites {
    width: 95%;
    height: clamp(60vh, 60vh, 60vh);
    padding: clamp(0.75rem, 2vw, 1rem);
    border-radius: 8px 8px 0 0;
  }
  #favorites::after {
    border-radius: 8px 8px 0 0;
  }
}

/* Larger screens (e.g., desktop) */
@media (min-width: 1200px) {
  #favorites {
    width: 80%;
    max-width: 1400px;
    height: clamp(60vh, 60vh, 60vh);
    padding: 1.5rem;
  }
  .favorite-modal-heading {
    font-size: clamp(1.75rem, 4vw, 2.25rem);
    -webkit-text-stroke: 0.6px rgba(31, 38, 135, 0.7);
  }
}



  /* Reviews section in Shop Details */
  .shop-details-reviews-container {
    max-height: 100px; /* Reduce height to fit mobile screens */
  }

  .shop-details-review-card {
    width: 150px; /* Shrink review cards for mobile */
    padding: 8px;
  }

/* Placeholder image styling for shops */
.shop-placeholder-image {
  max-width: 100%; /* Ensures it doesn’t exceed container width */
  height: auto; /* Maintains aspect ratio */
  border-radius: 8px; /* Matches banner card style */
  margin-bottom: 16px; /* Adds spacing below the image */
}

/* Mobile-specific adjustments */
@media (max-width: 480px) {
  .shop-placeholder-image {
    max-height: 150px; /* Limits height on mobile to fit screen */
  }
}

#maps-prompt-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1008;
}
#maps-prompt-modal > div {
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(5px);
  background: rgba(255, 255, 255, 0.15);
  border: 0.5px solid black;
  box-shadow: 5px 5px 10px rgba(209, 209, 209, 0.5), -5px -5px 10px rgba(255, 255, 255, 0.6), inset 3px 3px 6px rgba(209, 209, 209, 0.4), inset -3px -3px 6px rgba(255, 255, 255, 0.6);
  border-radius: 15px;
  padding: 15px;
  width: 85%;
  max-width: 350px;
  text-align: center;
}
#maps-prompt-modal p {
  margin-bottom: 20px;
  color: #333;
  font-size: 16px;
}
#google-maps-btn, #apple-maps-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 0.5px solid #333;
  box-shadow: 2px 2px 4px rgba(209, 209, 209, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  color: #333;
  font-size: 14px;
}
#google-maps-btn {
  margin-right: 10px;
}

/* Floating Button */
#taste-profile-btn {
    position: fixed;
    bottom: 5rem;
    right: 1rem;
    width: 50px;
    height: 50px;
    border: none;
    border-radius: 50%;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1000;
    transition: background 0.3s;
}

#taste-profile-btn:hover {
    background: #f0f0f0;
}

#taste-profile-btn img {
    width: 60%;
    height: 60%;
}

/* Modal Styles */
#quiz-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

#quiz-modal.hidden {
    display: none;
}

#quiz-content {
    background: rgba(102, 102, 102, 0.2); /* Darker glass tint */
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px); /* Safari support */
    padding: 2rem;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    text-align: center;
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.2),
                0 4px 20px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    position: relative;
}

#quiz-content::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 70%);
    pointer-events: none;
}


#quiz-options {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

#quiz-options button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    background: #f9f9f9;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
}

#quiz-options button:hover {
    background: #e0e0e0;
}

#quiz-next-btn, #quiz-close-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
}



.hidden {
    display: none;
}
