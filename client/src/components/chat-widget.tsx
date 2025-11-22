import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, X } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  messages: ChatMessage[];
  username?: string;
}

export function ChatWidget({ isOpen, onClose, onSendMessage, messages, username }: ChatWidgetProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input);
      setInput("");
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 w-80 h-96 bg-background border rounded-lg shadow-lg flex flex-col z-50" data-testid="div-chat-widget">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <h3 className="font-semibold" data-testid="text-chat-title">Live Chat</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-chat"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="text-sm" data-testid={`message-${msg.id}`}>
              <span className="font-semibold text-primary">{msg.username}</span>
              <p className="text-muted-foreground">{msg.text}</p>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        <Input
          placeholder="Say something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          data-testid="input-chat-message"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim()}
          data-testid="button-send-chat"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
