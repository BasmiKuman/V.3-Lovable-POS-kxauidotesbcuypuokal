import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useNewFeedNotification() {
  const [hasNewFeed, setHasNewFeed] = useState(false);
  const [newFeedCount, setNewFeedCount] = useState(0);

  useEffect(() => {
    checkNewFeeds();
    
    // Check every 5 minutes
    const interval = setInterval(checkNewFeeds, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkNewFeeds = async () => {
    try {
      // Get last viewed timestamp from localStorage
      const lastViewed = localStorage.getItem('last_feed_viewed');
      const lastViewedDate = lastViewed ? new Date(lastViewed) : new Date(0);

      console.log("🔔 Checking for new feeds...");
      console.log("   Last viewed:", lastViewed || "Never");

      // Get feeds published after last viewed
      const { data: feeds, error } = await supabase
        .from("feeds" as any)
        .select("id, title, published_at")
        .eq("status", "published")
        .gt("published_at", lastViewedDate.toISOString());

      if (error) {
        console.error("❌ Error fetching feeds:", error);
        throw error;
      }

      console.log("📢 New feeds found:", feeds?.length || 0);
      if (feeds && feeds.length > 0) {
        console.log("   Feeds:", feeds.map((f: any) => f.title));
      }

      const count = feeds?.length || 0;
      setNewFeedCount(count);
      setHasNewFeed(count > 0);
      
      console.log("   hasNewFeed:", count > 0);
    } catch (error) {
      console.error("Error checking new feeds:", error);
    }
  };

  const markFeedsAsViewed = () => {
    localStorage.setItem('last_feed_viewed', new Date().toISOString());
    setHasNewFeed(false);
    setNewFeedCount(0);
  };

  return { hasNewFeed, newFeedCount, markFeedsAsViewed, checkNewFeeds };
}
