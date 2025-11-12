import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PostSuggestion {
  category: string;
  content: string;
  tags: string[];
}

interface SuggestedPostsProps {
  onSelectSuggestion: (content: string, category: string, tags: string[]) => void;
}

export function SuggestedPosts({ onSelectSuggestion }: SuggestedPostsProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading } = useQuery<{ posts?: PostSuggestion[] }>({
    queryKey: ["/api/ai/suggest-posts", refreshKey],
    staleTime: 5 * 60 * 1000,
  });

  const suggestions = data?.posts || [];

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!suggestions.length && !isLoading) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">AI Post Ideas</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          data-testid="button-refresh-suggestions"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 border rounded-md hover-elevate cursor-pointer"
              onClick={() => onSelectSuggestion(suggestion.content, suggestion.category, suggestion.tags)}
              data-testid={`suggestion-${index}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  {suggestion.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {suggestion.content}
              </p>
              {suggestion.tags && suggestion.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {suggestion.tags.map((tag, i) => (
                    <span key={i} className="text-xs text-primary">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
