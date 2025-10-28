import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle deep links for email verification and password reset
// This runs when app is opened via deep link (com.basmikuman.pos://...)
if (typeof window !== 'undefined') {
  // Listen for URL changes (for Android deep links)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.url) {
      const url = new URL(event.data.url);
      console.log('Deep link opened:', event.data.url);
      
      // Extract the hash part from the URL (Supabase sends tokens in hash)
      if (url.hash) {
        // Redirect to the auth page with the hash
        window.location.href = `${window.location.origin}/auth${url.hash}`;
      } else if (url.pathname) {
        // Redirect to the appropriate page
        window.location.href = `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
