"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import type { ReportChatMessage } from "@cadence/shared"
import { Loader2Icon, SendIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import { postReportChat } from "@/lib/api/assistant"
import { useDashboardFilters } from "@/lib/hooks/use-dashboard-filters"
import { cn } from "@/lib/utils"

const SUGGESTED_QUESTIONS = [
  "What did the team complete this week?",
  "What were the main blockers?",
  "Summarize this team's activity.",
  "Are there any workload imbalances?",
]

const FALLBACK_ERROR_MESSAGE = "I couldn't analyze this report right now. Please try again."

interface ChatEntry extends ReportChatMessage {
  id: string
  isError?: boolean
}

/**
 * The current dashboard filters (week/member/project/status) travel with
 * every question so the assistant answers for the same slice of data the
 * manager is looking at. The server independently re-validates and re-fetches
 * by these values — the client only supplies what it's already viewing.
 */
export function ReportChatWidget() {
  const { get } = useDashboardFilters()
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState<ChatEntry[]>([])
  const bottomRef = React.useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: (question: string) =>
      postReportChat({
        question,
        filters: {
          week: get("week"),
          userId: get("userId"),
          projectId: get("projectId"),
          status: get("status"),
        },
        history: messages
          .filter((message) => !message.isError)
          .map(({ role, content }) => ({ role, content })),
      }),
  })

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, mutation.isPending])

  function send(question: string) {
    const trimmed = question.trim()
    if (!trimmed || mutation.isPending) return

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }])
    setInput("")

    mutation.mutate(trimmed, {
      onSuccess: (response) => {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: response.answer },
        ])
      },
      onError: (error) => {
        const content = error instanceof ApiError ? error.message : FALLBACK_ERROR_MESSAGE
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content, isError: true },
        ])
      },
    })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      send(input)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="fixed right-6 bottom-6 z-40 h-11 gap-2 rounded-full px-4 shadow-lg">
          <SparklesIcon />
          Ask AI
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>AI Report Assistant</SheetTitle>
          <SheetDescription>Ask questions about your team&apos;s activity</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-3 p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Answers are based only on the reports currently matching your dashboard filters.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <Button
                      key={question}
                      variant="outline"
                      size="sm"
                      className="h-auto justify-start py-2 text-left whitespace-normal"
                      onClick={() => send(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted text-foreground",
                  message.isError && "border border-destructive/40 bg-destructive/10 text-destructive",
                )}
              >
                <p className="mb-0.5 text-xs font-medium opacity-70">
                  {message.role === "user" ? "You" : "AI Assistant"}
                </p>
                {message.content}
              </div>
            ))}

            {mutation.isPending && (
              <div className="mr-auto flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                AI is analyzing the report...
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this report..."
              disabled={mutation.isPending}
              rows={1}
              className="max-h-32"
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={mutation.isPending || !input.trim()}
            >
              <SendIcon />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
