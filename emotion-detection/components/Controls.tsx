"use client";
import { useVoice } from "@humeai/voice-react";
import { Button } from "./ui/button";
// Import Save icon from lucide-react
import { Mic, MicOff, Phone, Save } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toggle } from "./ui/toggle";
import MicFFT from "./MicFFT";
import { cn } from "@/utils";
import { useEffect } from "react";
// Import the helper function
import { getTopEmotions } from "@/utils/getTop3Emotions"; // Adjust path if needed

export default function Controls() {
  const {
    disconnect,
    status,
    isMuted,
    unmute,
    mute,
    micFft,
    pauseAssistant,
    // *** ADD messages HERE to access conversation data ***
    messages,
  } = useVoice();

  // Effect to pause assistant (keep this from previous step)
  // Inside Controls.tsx

  useEffect(() => {
    // Log every time the effect runs, showing the current status
    console.log(`Hume connection status: ${status.value}`);

    if (status.value === "connected") {
      // *** Use setTimeout to delay the pause call slightly ***
      const timerId = setTimeout(() => {
        console.log(
          "Status is connected, executing delayed pauseAssistant()..."
        ); // New log
        pauseAssistant();
      }, 10); // Small delay (e.g., 10ms)

      // Cleanup function to clear the timeout if the status changes
      // before the timeout fires (e.g., disconnects immediately)
      return () => clearTimeout(timerId);
    }
    // Optional: Add logs for other states too
    else if (status.value === "error") {
      console.error("Hume connection status is now: error");
    } else if (status.value === "disconnected") {
      console.log("Hume connection status is now: disconnected");
    }
  }, [status.value, pauseAssistant]); // Keep dependencies

  // *** FUNCTION TO HANDLE SAVING ***
  const handleSaveConversation = () => {
    if (!messages || messages.length === 0) {
      console.log("No messages to save.");
      return; // Or show a message to the user
    }

    // 1. Filter and format user messages
    const userMessagesToSave = messages
      .filter((msg) => msg.type === "user_message" && msg.message?.content)
      .map((msg) => {
        // Double-check the type inside the map (helps TypeScript)
        if (msg.type === "user_message") {
          return {
            // ***** THIS IS THE UPDATED LINE *****
            timestamp: msg.receivedAt
              ? msg.receivedAt.toISOString()
              : new Date().toISOString(),
            // ***** THIS IS THE UPDATED LINE *****
            role: "user",
            text: msg.message.content,
            top_3_emotions: getTopEmotions(msg.models?.prosody?.scores, 3),
          };
        }
        // This should theoretically not be reached because of the filter,
        // but satisfies TypeScript's need for handling all paths.
        return null;
      })
      // Filter out any nulls potentially introduced (though unlikely)
      .filter(Boolean);

    if (userMessagesToSave.length === 0) {
      console.log("No user messages found to save.");
      return; // Or show a message
    }

    // 2. Create JSON Blob
    const jsonData = JSON.stringify(userMessagesToSave, null, 2); // Pretty print JSON
    const blob = new Blob([jsonData], { type: "application/json" });

    // 3. Create Download Link and Trigger Click
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hume_conversation_${new Date().toISOString()}.json`; // Filename
    document.body.appendChild(a); // Append anchor to body (needed for Firefox)
    a.click();

    // 4. Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("Conversation saved to JSON.");
  };
  // *** END OF SAVE FUNCTION ***

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 w-full p-4 flex items-center justify-center",
        "bg-gradient-to-t from-card via-card/90 to-card/0"
      )}
    >
      <AnimatePresence>
        {status.value === "connected" ? (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            className={
              "p-4 bg-card border border-border rounded-lg shadow-sm flex items-center gap-4 flex-wrap justify-center" // Added flex-wrap and justify-center
            }
          >
            {/* User Mic Toggle */}
            <Toggle
              pressed={!isMuted}
              onPressedChange={() => {
                isMuted ? unmute() : mute();
              }}
            >
              {isMuted ? (
                <MicOff className={"size-4"} />
              ) : (
                <Mic className={"size-4"} />
              )}
            </Toggle>

            {/* Mic Visualization */}
            <div className={"relative grid h-8 w-48 shrink grow-0"}>
              <MicFFT fft={micFft} className={"fill-current"} />
            </div>

            {/* *** SAVE CONVERSATION BUTTON *** */}
            <Button
              className={"flex items-center gap-1"}
              onClick={handleSaveConversation}
              variant={"outline"} // Use outline or another appropriate variant
            >
              <span>
                <Save className={"size-4 opacity-70"} />
              </span>
              <span>Save Conv.</span>
            </Button>
            {/* *** END SAVE BUTTON *** */}

            {/* End Call Button */}
            <Button
              className={"flex items-center gap-1"}
              onClick={() => {
                disconnect();
              }} // Keep original disconnect logic here
              variant={"destructive"}
            >
              <span>
                <Phone
                  className={"size-4 opacity-50"}
                  strokeWidth={2}
                  stroke={"currentColor"}
                />
              </span>
              <span>End Call</span>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
