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

      // Get feeds published after last viewed
      const { data: feeds, error } = await supabase
        .from("feeds" as any)
        .select("id")
        .eq("status", "published")
        .gt("published_at", lastViewedDate.toISOString());

      if (error) throw error;

      const count = feeds?.length || 0;
      setNewFeedCount(count);
      setHasNewFeed(count > 0);
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
