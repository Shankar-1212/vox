"use client";
import { cn } from "@/utils";
import { useVoice } from "@humeai/voice-react";
import Expressions from "./Expressions"; // Assuming this component correctly displays emotions
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef } from "react";

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages } = useVoice();

  return (
    <motion.div
      layoutScroll
      className={"grow rounded-md overflow-auto p-4"}
      ref={ref}
    >
      <motion.div
        className={"max-w-2xl mx-auto w-full flex flex-col gap-4 pb-24"}
      >
        <AnimatePresence mode={"popLayout"}>
          {messages.map((msg, index) => {
            // **** THIS IS THE LINE TO CHANGE ****
            // Only process and render messages from the user
            if (msg.type === "user_message") {
            // **** CHANGE IS HERE ^^^^^^^^^^ ****
              return (
                <motion.div
                  key={msg.type + index}
                  className={cn(
                    "w-[80%]",
                    "bg-card",
                    "border border-border rounded",
                    // This condition will now always be true, effectively just adding "ml-auto"
                    msg.type === "user_message" ? "ml-auto" : ""
                  )}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: 0,
                  }}
                >
                  <div
                    className={cn(
                      "text-xs capitalize font-medium leading-none opacity-50 pt-4 px-3"
                    )}
                  >
                    {/* This will now always display "user" */}
                    {msg.message.role}
                  </div>
                  <div className={"pb-3 px-3"}>
                    {/* This displays the user's transcribed text */}
                    {msg.message.content}
                  </div>
                  {/* This now correctly shows emotions ONLY for the user message */}
                  {/* Make sure the Expressions component shows the top 3 */}
                  <Expressions values={{ ...msg.models.prosody?.scores }} />
                </motion.div>
              );
            }

            // Ignore assistant messages and any other message types
            return null;
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
});

export default Messages;