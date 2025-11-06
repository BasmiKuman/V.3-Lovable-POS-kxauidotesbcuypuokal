import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Video, ExternalLink, Instagram, Facebook, MessageCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type Feed = {
  id: string;
  title: string;
  content: string;
  image_url?: string | null;
  video_url?: string | null;
  link_url?: string | null;
  link_text?: string | null;
  social_links?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  } | null;
  published_at: string;
};

export function RiderFeedCard() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeeds();
  }, []);

  const loadFeeds = async () => {
    try {
      const { data, error } = await supabase
        .from("feeds" as any)
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setFeeds((data as any) || []);
    } catch (error) {
      console.error("Error loading feeds:", error);
    } finally {
      setLoading(false);
    }
  };

  const getVideoType = (url: string): "youtube" | "instagram" | "facebook" | "other" => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "youtube";
    }
    if (url.includes("instagram.com")) {
      return "instagram";
    }
    if (url.includes("facebook.com") || url.includes("fb.watch")) {
      return "facebook";
    }
    return "other";
  };

  const getYouTubeEmbedUrl = (url: string) => {
    // Convert YouTube watch URL to embed URL
    if (url.includes("youtube.com/watch?v=")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Convert YouTube short URL to embed URL
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Convert YouTube Shorts URL to embed URL
    if (url.includes("youtube.com/shorts/")) {
      const videoId = url.split("shorts/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const getFacebookEmbedUrl = (url: string) => {
    // Facebook video embed
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=500`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Memuat pengumuman...
        </CardContent>
      </Card>
    );
  }

  if (feeds.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Belum ada pengumuman
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {feeds.map((feed) => (
        <Card key={feed.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-base md:text-lg">{feed.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(feed.published_at), "dd MMMM yyyy, HH:mm", { locale: id })}
                </div>
              </div>
              <Badge variant="default" className="text-xs">Baru</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image */}
            {feed.image_url && (
              <div className="rounded-lg overflow-hidden border">
                <img 
                  src={feed.image_url} 
                  alt={feed.title}
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Video */}
            {feed.video_url && (
              <div className="rounded-lg overflow-hidden border bg-black/5">
                {getVideoType(feed.video_url) === "youtube" && (
                  <div className="aspect-video relative group">
                    <iframe
                      src={getYouTubeEmbedUrl(feed.video_url)}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={feed.title}
                      loading="lazy"
                    />
                    {/* Play indicator overlay */}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      ▶ Klik untuk play
                    </div>
                  </div>
                )}
                
                {getVideoType(feed.video_url) === "facebook" && (
                  <div className="aspect-video relative group">
                    <iframe
                      src={getFacebookEmbedUrl(feed.video_url)}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                      title={feed.title}
                      loading="lazy"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      ▶ Klik untuk play
                    </div>
                  </div>
                )}

                {(getVideoType(feed.video_url) === "instagram" || getVideoType(feed.video_url) === "other") && (
                  <div className="p-6 bg-muted/30 flex flex-col items-center gap-3 min-h-[200px] justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Video className="h-6 w-6" />
                      <span className="text-sm font-medium">
                        {getVideoType(feed.video_url) === "instagram" 
                          ? "Video Instagram" 
                          : "Video"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center max-w-[250px]">
                      {getVideoType(feed.video_url) === "instagram" 
                        ? "Instagram tidak support video embed. Gunakan YouTube untuk video yang bisa diputar langsung." 
                        : "Platform ini belum support embed. Gunakan YouTube atau Facebook untuk hasil terbaik."}
                    </p>
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2 mt-1"
                      onClick={() => window.open(feed.video_url!, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Buka Video
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {feed.content}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Main Link */}
              {feed.link_url && (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(feed.link_url!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  {feed.link_text || "Selengkapnya"}
                </Button>
              )}

              {/* Social Links */}
              {feed.social_links?.instagram && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(feed.social_links!.instagram!, "_blank")}
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Button>
              )}
              
              {feed.social_links?.facebook && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(feed.social_links!.facebook!, "_blank")}
                >
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Button>
              )}
              
              {feed.social_links?.whatsapp && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open(feed.social_links!.whatsapp!, "_blank")}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
