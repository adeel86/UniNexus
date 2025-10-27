import { Image, Smile, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

export function PostComposer() {
  const [content, setContent] = useState("");

  const handlePost = () => {
    console.log("Posting:", content);
    setContent("");
  };

  return (
    <Card className="rounded-2xl" data-testid="card-post-composer">
      <div className="p-4">
        <div className="flex gap-3">
          <Avatar className="ring-2 ring-primary/10">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-chart-2 text-white">JD</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none border-0 p-0 focus-visible:ring-0 text-base"
              data-testid="textarea-post-content"
            />
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-add-image">
                  <Image className="h-5 w-5 text-chart-2" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-add-emoji">
                  <Smile className="h-5 w-5 text-chart-3" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-add-hashtag">
                  <Hash className="h-5 w-5 text-primary" />
                </Button>
              </div>
              
              <Button 
                className="rounded-full bg-gradient-to-r from-primary to-chart-2 px-6"
                onClick={handlePost}
                disabled={!content.trim()}
                data-testid="button-post"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
