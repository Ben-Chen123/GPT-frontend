import React, { useState, useEffect } from "react";
import { useRef} from "react";
import "./App.css";

function App() {
  const initialMessage =
    "Hi! I’m ProactiMate, your motivational chatbot. My goal is to help you reflect on your procrastination habits and work towards overcoming them. I won’t give specific advice but will guide you to clarify your goals. What aspect of procrastination would you like to focus on today?";
  const [messages, setMessages] = useState([
    { role: "assistant", content: initialMessage },
  ]);
 // Generate NEW user_id every page refresh
 function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
 const [userId] = useState(() => generateUUID());
  // --- Generate or retrieve persistent user_id ---
  //const [userId] = useState(() => {
    //const saved = localStorage.getItem("user_id");
    //if (saved) return saved;
    //const newId = crypto.randomUUID(); // generate unique id
    //localStorage.setItem("user_id", newId);
    //return newId;
  //});
  
  const [stage, setStage] = useState("Engaging and Focusing");
  // Pomodoro state
  const [time, setTime] = useState(25 * 60); // 25 min
  const [isRunning, setIsRunning] = useState(false);
  const [task, setTask] = useState("");
  const [rewards, setRewards] = useState([]);
  const [isEnded, setIsEnded] = useState(false);
  const chatEndRef = useRef(null);
  const chatBoxRef = useRef(null);
  const [engagementLevel, setEngagementLevel] = useState("medium");
  const [responseTimes, setResponseTimes] = useState([]);
  const [lastBotMessageTime, setLastBotMessageTime] = useState(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [botAvatar, setBotAvatar] = useState("🤖"); // default avatar
  const [userAvatar, setUserAvatar] = useState("👨"); // default male
  const [showUserPicker, setShowUserPicker] = useState(false);
  const saveMetrics = async (extraMetrics = {}) => {
    try {
      const experimentMetrics = {
        user_id: userId,
  
        task_initiation_delay: taskInitiationDelay,
  
        completion_rate: completedTasks,
  
        completion_time: completionTime,
  
        focus_duration: focusDuration,
  
        daily_adherence: dailyAdherence,
  
        ...extraMetrics,
      };
  
      await fetch("/save_metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(experimentMetrics),
      });
  
      console.log("Metrics saved");
    } catch (error) {
      console.error("Error saving metrics:", error);
    }
  };
  const avatars = {
    AI: ["🤖", "👾", "🛸"],
    Coach: ["🧠", "🤓", "🧐", "👩‍🏫"],
    Motivator: ["🔥", "💪", "🚀", "🌟"],
    Calm: ["🧘", "🌿", "🌙", "☀️"],
    Friendly: ["😊", "😄", "😇", "🥰"]
  };
  const [progressType, setProgressType] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [ifThenPlan, setIfThenPlan] = useState({ trigger: "", action: "" });
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [savedPlans, setSavedPlans] = useState([]);
  const [sessionStartTime] = useState(Date.now());
  const [taskInitiationDelay, setTaskInitiationDelay] = useState(null);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [completionTime, setCompletionTime] = useState(0);
  const [focusDuration, setFocusDuration] = useState(0);
  const [dailyAdherence, setDailyAdherence] = useState(0);
  const [sessionLength, setSessionLength] = useState(0);
  const [taskStartTime, setTaskStartTime] = useState(null);
  const experimentMetrics = {

    user_id: userId,
  
    task_initiation_delay: taskInitiationDelay,
  
    completion_rate: completedTasks,
  
    completion_time: completionTime,
  
    focus_duration: focusDuration,
  
    daily_adherence: dailyAdherence,
  };
  const stageLabels = {
    "Engaging and Focusing": "Understand",
    Evoking: "Get Motivated",
    Planning: "Make a Plan",
  };
  const [planConfidence, setPlanConfidence] = useState(75);
  // Generate implementation intention from conversation history
  const generateIfThenPlan = async () => {
    setIsGeneratingPlan(true);
  
    try {
      const conversationContext = messages
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
  
      const response = await fetch(
        "https://api.chatanywhere.org/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content: `
  You are an expert behavior-change coach.
  Generate a concrete implementation intention in JSON format.
  
  Required format:
  {
    "trigger": "...",
    "action": "..."
  }
  
  Rules:
  - Trigger must describe a specific situational cue.
  - Action must be immediate, concrete, and achievable.
  - Return ONLY valid JSON.
  - Do not include markdown formatting or explanations.
                `,
              },
              {
                role: "user",
                content: conversationContext,
              },
            ],
          }),
        }
      );
  
      const data = await response.json();
      let content = data.choices[0].message.content.trim();
  
      // Remove markdown code fences if present
      content = content.replace(/```json|```/g, "").trim();
  
      const plan = JSON.parse(content);
  
      setIfThenPlan({
        trigger: plan.trigger || "",
        action: plan.action || "",
      });
    } catch (error) {
      console.error("Error generating if-then plan:", error);
  
      setIfThenPlan({
        trigger: "When I notice I am procrastinating",
        action: "I will work on my task for five minutes",
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };
  // Automatically generate a plan when entering the Planning stage
  useEffect(() => {
    if (
      stage === "Planning" &&
      messages.length >= 4 &&
      !ifThenPlan.trigger &&
      !isGeneratingPlan
    ) {
      generateIfThenPlan();
    }
  }, [stage]);

  const saveIfThenPlan = () => {
    const planText = `If ${ifThenPlan.trigger}, then ${ifThenPlan.action}.`;
  
    setSavedPlans((prev) => [...prev, {
      id: Date.now(),
      trigger: ifThenPlan.trigger,
      action: ifThenPlan.action,
      text: planText,
      createdAt: new Date().toISOString(),
    }]);
  
    alert("Your implementation plan has been saved successfully.");
  };

  const detectProgressCue = async (text) => {
    try {
      const response = await fetch("https://api.chatanywhere.org/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`, 
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "You are a strict classifier. Only output one label: completion, partial, effort, or none.",
            },
            {
              role: "user",
              content: `
  Classify this message:
  
  - completion → task fully finished
  - partial → some progress made
  - effort → tried but unclear progress
  - none → no progress indication
  
  Message:
  "${text}"
  `,
            },
          ],
        }),
      });
  
      const data = await response.json();
      const label = data.choices[0].message.content.trim().toLowerCase();
  
      return label;
    } catch (error) {
      console.error("LLM classification error:", error);
      return null;
    }
  };
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
  
    if (!lastMessage) return;
  
    // Only track when USER replies
    if (lastMessage.role === "user" && lastBotMessageTime) {
      const delay = Date.now() - lastBotMessageTime;
  
      setResponseTimes(prev => [...prev.slice(-1), delay]);
    }
  
    // Track when BOT speaks
    if (lastMessage.role === "assistant") {
      setLastBotMessageTime(Date.now());
    }
  
  }, [messages]);

  const addReward = async () => {
    if (task.trim() !== "") {
  
      // Delay from the end of focus time until logging completion
      const loggingDelay =
        Math.max(
          Math.floor((Date.now() - sessionStartTime) / 1000) - focusDuration,
          0
        );
  
      // Total task duration
      const totalTaskDuration = focusDuration + loggingDelay;
  
      // Add reward
      setRewards(prev => [...prev, task]);
  
      // Update completion count
      const newCompletionRate = completedTasks + 1;
      setCompletedTasks(newCompletionRate);
  
      // Update completion time state
      setCompletionTime(totalTaskDuration);
  
      // Clear input
      setTask("");
  
      const experimentMetrics = {
        user_id: userId,
        task_initiation_delay: taskInitiationDelay,
        completion_rate: newCompletionRate,
        completion_time: totalTaskDuration,
        focus_duration: focusDuration,
        daily_adherence: dailyAdherence,
      };
  
      try {
        await fetch("/save_metrics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(experimentMetrics),
        });
      } catch (error) {
        console.error("Error saving metrics:", error);
      }
    }
  };

  // Countdown logic
  useEffect(() => {
    let timer;
  
    if (isRunning && time > 0) {
      timer = setInterval(() => {
  
        setTime((t) => Math.max(t - 1, 0));
  
  
        setFocusDuration((prev) => prev + 1);
  
      }, 1000);
    }
  
    return () => clearInterval(timer);
  
  }, [isRunning, time]);

  useEffect(() => {
    if (time === 0 && isRunning) {
  
      setIsRunning(false);
  
      // ===== SAVE COMPLETION =====
      saveMetrics({
        completion_time: completionTime,
        completion_rate: completedTasks + 1,
      });
  
      setCompletedTasks(prev => prev + 1);
  
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "⏰ Time’s up! What did you accomplish?"
        }
      ]);
    }
  }, [time]);
  const toggleTimer = async () => {

    // ===== FIRST START =====
    if (!isRunning && taskInitiationDelay === null) {
      
  
      const delaySeconds =
        Math.floor((Date.now() - sessionStartTime) / 1000);
  
      setTaskInitiationDelay(delaySeconds);
  
      await saveMetrics({
        task_initiation_delay: delaySeconds,
      });
    }
  
    // ===== PAUSE =====
    if (isRunning) {
  
      await saveMetrics({
        focus_duration: focusDuration,
      });
    }
  
    setIsRunning(!isRunning);
    setTaskStartTime(Date.now());
  };
  
  const resetTimer = () => {
    setIsRunning(false);
    setTime(25 * 60);
  };
  // Format time (MM:SS)
  const formatTime = (t) => {
    const m = Math.floor(t / 60)
      .toString()
      .padStart(2, "0");
    const s = (t % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestedAction, setSuggestedAction] = useState(null);
  
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages, loading]);
  // --- Send message to backend ---
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    const detected = await detectProgressCue(input);
    setProgressType(detected);
    if (progressType === "completion") {
      setSuggestedAction("Great progress! What’s the smallest next step you can take right now?");
    }
    if (progressType === "partial") {
      setSuggestedAction("You're in motion. Want to continue for 5 more focused minutes?");
    }
    if (progressType === "effort") {
      setSuggestedAction("Even trying counts. What’s one tiny step you could attempt next?");
    }
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId, // ✅ send user_id
          message: input,
        }),
      });
      const data = await response.json();
      const assistantMessage = { role: "assistant", content: data.response };

      // ✅ Append chatbot reply
      setMessages((prev) => [...prev, assistantMessage]);
      if (data.stage) setStage(data.stage);

      // ✅ If farewell message is returned
      if (data.farewell) {

        const farewellMessage = {
          role: "assistant",
          content: data.farewell
        };
      
        setMessages((prev) => [...prev, farewellMessage]);
      
        setIsEnded(true);
      
        // ✅ calculate updated value FIRST
        const updatedAdherence = dailyAdherence + 1;
      
        setDailyAdherence(updatedAdherence);
      
        // ===== SAVE METRICS =====
      
        const experimentMetrics = {
      
          user_id: userId,
      
          task_initiation_delay: taskInitiationDelay,
      
          completion_rate: completedTasks,
      
          completion_time: completionTime,
      
          focus_duration: focusDuration,
      
          daily_adherence: updatedAdherence, // ✅ USE UPDATED VALUE
        };
      
        await fetch("/save_metrics", {
      
          method: "POST",
      
          headers: {
            "Content-Type": "application/json",
          },
      
          body: JSON.stringify(experimentMetrics),
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length < 3) return;
  
    const userMessages = messages.filter(m => m.role === "user");
    const avgLength =
      userMessages.reduce((sum, m) => sum + m.content.length, 0) /
      userMessages.length;
  
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
  
    // Engagement logic
    if (avgLength > 120 && avgResponseTime < 15000) {
      setEngagementLevel("high");
    } else if (avgLength < 40 && avgResponseTime > 30000) {
      setEngagementLevel("low");
    } else {
      setEngagementLevel("medium");
    }
  }, [messages, responseTimes]);


  // --- Handle Enter key ---
  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };
  const ProgressFeedback = () => {
    const displayStage = stageLabels[stage] || stage;
    if (engagementLevel === "high") {
      return (
        <div className="progress-feedback high">
          🔥 You're actively reflecting and moving forward — great momentum!
        </div>
      );
    }
  
    if (engagementLevel === "low") {
      return (
        <div className="progress-feedback low">
          💭 It seems things might feel slow — take your time, small steps count.
        </div>
      );
    }
  
    return (
      <div className="progress-feedback medium">
        🌱 You're making steady progress in the <strong>{displayStage}</strong> stage.
      </div>
    );
  };
  useEffect(() => {
    const savedAvatar = localStorage.getItem("bot_avatar");
    if (savedAvatar) setBotAvatar(savedAvatar);
  }, []);
  useEffect(() => {
    const savedUserAvatar = localStorage.getItem("user_avatar");
    if (savedUserAvatar) setUserAvatar(savedUserAvatar);
  }, []);
  
  useEffect(() => {
    localStorage.setItem("user_avatar", userAvatar);
  }, [userAvatar]);
  return (
    <div className="main-layout">
      {/* ===== Left Side: Chatbot + Progress Bar + Pomodoro ===== */}
      <div className="left-panel">
          <ProgressFeedback />
          {/* Suggested Action Area */}
{progressType === "partial" && (
  <div className="action-suggestion">
    ⚡ Keep momentum going:
    <button
      onClick={() => {
        setTime(5 * 60);
        setIsRunning(true);
        setSuggestedAction(null);
        setShowTimer(true);
      }}
    >
      Start 5-Min Focus
    </button>
  </div>
)}

{progressType === "completion" && (
  <div className="action-suggestion">
    🎉 Great job!
    <button
      onClick={() => {
        setTime(10 * 60);
        setIsRunning(true);
        setSuggestedAction(null);
        setShowTimer(true);
      }}
    >
      Start Next 10-Min Sprint
    </button>
  </div>
)}

{progressType === "effort" && (
  <div className="action-suggestion">
    💪 Trying counts.
    <button
      onClick={() => {
        setTime(3 * 60);
        setIsRunning(true);
        setSuggestedAction(null);
        setShowTimer(true);
      }}
    >
      Try 3-Min Reset
    </button>
  </div>
)}

        </div>
  
        {/* Chat Interface Section */}
        <div className="app-container">
          <h1>🕒 ProactiMate</h1>
  
          <div className="chat-box" ref={chatBoxRef}>
          {messages.map((msg, idx) => (
  <div
    key={idx}
    className={`message-row ${msg.role === "user" ? "user" : "assistant"}`}
  >

    {/* ===== BOT AVATAR ===== */}
    {msg.role === "assistant" && (
      <div className="avatar-wrapper">
        <div
          className="avatar"
          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          title="Click to change avatar"
        >
          {botAvatar.startsWith("http") ? (
            <img
              src={botAvatar}
              alt="ProactiMate"
              className="chatbot-avatar"
            />
          ) : (
            botAvatar
          )}
        </div>

        {showAvatarPicker && (
          <div className="avatar-picker-popup">
          {Object.entries(avatars).map(([category, emojiList]) => (
            <div key={category} className="avatar-category">
              <div className="avatar-category-title">{category}</div>
        
              <div className="avatar-grid">
                {emojiList.map((avatar, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setBotAvatar(avatar);
                      setShowAvatarPicker(false);
                      localStorage.setItem("bot_avatar", avatar);
                    }}
                    className={botAvatar === avatar ? "selected" : ""}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    )}

    {/* ===== MESSAGE TEXT ===== */}
    <div className={`message ${msg.role}`}>
      <b>{msg.role === "user" ? "You" : "ProactiMate"}:</b>{" "}
      {msg.content}
    </div>

    {/* ===== USER AVATAR ===== */}
    {msg.role === "user" && (
      <div className="avatar-wrapper user-avatar-wrapper">
        <div
          className="avatar user-avatar"
          onClick={() => setShowUserPicker(!showUserPicker)}
          title="Click to change avatar"
        >
          {userAvatar}
        </div>

        {showUserPicker && (
          <div className="avatar-picker-popup user-picker">
            {["👨", "👩"].map((avatar, i) => (
              <button
                key={i}
                onClick={() => {
                  setUserAvatar(avatar);
                  setShowUserPicker(false);
                }}
                className={userAvatar === avatar ? "selected" : ""}
              >
                {avatar}
              </button>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
))}
  
  {loading && (
  <div className="message-row assistant">
    <div
      className="avatar-wrapper"
      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
      title="Click to change avatar"
    >
      <div className="avatar">
        {botAvatar.startsWith("http") ? (
          <img src={botAvatar} alt="ProactiMate" className="chatbot-avatar" />
        ) : (
          botAvatar
        )}
      </div>

      {showAvatarPicker && (
        <div className="avatar-picker-popup">
        {Object.entries(avatars).map(([category, emojiList]) => (
          <div key={category} className="avatar-category">
            <div className="avatar-category-title">{category}</div>
      
            <div className="avatar-grid">
              {emojiList.map((avatar, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setBotAvatar(avatar);
                    setShowAvatarPicker(false);
                    localStorage.setItem("bot_avatar", avatar);
                    localStorage.setItem("bot_avatar_category", category); // optional
                  }}
                  className={botAvatar === avatar ? "selected" : ""}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
    <div className="message assistant">Typing...</div>
  </div>
)}
            <div ref={chatEndRef} />
          </div>
  
          <div className="input-box">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                isEnded
                  ? "Conversation has ended."
                  : "Type your message..."
              }
              disabled={isEnded}
            />
            <button
  onClick={sendMessage}
  disabled={isEnded}
>
  {isEnded ? "Ended" : "Send"}
</button>
          </div>
        </div>
        {stage === "Planning" && (
  <div className="pomodoro-timer enhanced">
    <div className="timer-header">
      <h2>
        {isRunning ? '🎯 Focus Session' : '🍅 Pomodoro Timer'}
      </h2>
      <p className="timer-subtitle">
        {isRunning
          ? 'Stay focused — you’ve got this!'
          : 'Ready to begin your next focused sprint?'}
      </p>
    </div>

    <div className="timer-circle-wrapper">
      <div className={`timer-circle ${isRunning ? 'active' : ''}`}>
        <span className="timer-display">{formatTime(time)}</span>
      </div>
    </div>

    <div className="timer-controls">
      <button
        className={`timer-btn primary ${isRunning ? 'pause' : 'start'}`}
        onClick={toggleTimer}
        style={{ backgroundColor: '#4CAF50', color: 'white' }}
      >
        {isRunning ? '⏸ Pause' : '▶ Start'}
      </button>

      <button
  className="timer-btn secondary"
  onClick={resetTimer}
  style={{ backgroundColor: '#ff4444', color: 'white' }}
>
        🔄 Reset
      </button>
    </div>

    <div className="timer-status">
      {isRunning ? (
        <span className="status-running">🟢 In Progress</span>
      ) : (
        <span className="status-paused">⚪ Ready</span>
      )}
    </div>
  </div>
)}

{/* ===== Right Side: Planner + Reward Tracker ===== */}
<div className="right-panel">
    {stage === "Planning" && (
          <div className="planner-section">
          <div className="planner-header">
            <h2>📝 Smart If–Then Planner</h2>
            <p>
              Turn your intentions into concrete actions. Your personalized plan is
              generated from our conversation.
            </p>
          </div>
        
          <div className="planner-box enhanced">
            {isGeneratingPlan ? (
              <div className="plan-loading">
                <div className="loading-spinner"></div>
                <p>🤖 Creating your personalized action plan...</p>
              </div>
            ) : (
              <>
                <label>If...</label>
              <input
                type="text"
                value={ifThenPlan.trigger}
                onChange={(e) =>
                  setIfThenPlan((prev) => ({
                    ...prev,
                    trigger: e.target.value,
                  }))
                }
                placeholder="Situational trigger"
              />
                   <label>Then...</label>
              <input
                type="text"
                value={ifThenPlan.action}
                onChange={(e) =>
                  setIfThenPlan((prev) => ({
                    ...prev,
                    action: e.target.value,
                  }))
                }
                placeholder="Concrete action"
              />

                <div className="confidence-section">
                  <label>How confident are you that you'll follow this plan?</label>
                  <div className="confidence-slider-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={planConfidence}
                      onChange={(e) => setPlanConfidence(Number(e.target.value))}
                      className="confidence-slider"
                    />
                    <span className="confidence-value">{planConfidence}%</span>
                  </div>
                </div>
        
                <div className="planner-buttons">
                  <button
                    className="generate-plan-btn"
                    onClick={generateIfThenPlan}
                    disabled={isGeneratingPlan}
                  >
                    🔄 Regenerate Plan
                  </button>
        
                  <button
                    className="save-plan-btn"
                    onClick={saveIfThenPlan}
                    disabled={!ifThenPlan.trigger || !ifThenPlan.action}
                  >
                    💾 Save My Plan
                  </button>
                </div>
        
                <div className="planner-tip">
                  💡 Tip: The more specific your trigger and action, the more effective
                  your plan will be.
                </div>
              </>
            )}
          </div>
        </div>        
)}

      
      {/* Reward Tracker */}
<div className="reward-section premium">
  <div className="reward-header">
    <h2>🎯 Your Progress</h2>
    <p>Small wins build lasting habits. Keep going.</p>
  </div>

  <div className="reward-box premium">
    {/* Input */}
    <div className="reward-input-group">
      <input
        type="text"
        placeholder="I made progress by..."
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />
      <button
        className="add-btn"
        onClick={addReward}
        disabled={!task.trim()}
        style={{
          backgroundColor: task.trim() ? '#4CAF50' : '#cccccc',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: task.trim() ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease'
        }}
      >
        Add
      </button>
    </div>

    {/* Identity Reinforcement */}
    <div className="identity-box">
      {rewards.length === 0 ? (
        <span>💭 You’re getting started.</span>
      ) : rewards.length < 5 ? (
        <span>🌱 You’re building momentum.</span>
      ) : rewards.length < 10 ? (
        <span>🔥 You’re becoming consistent.</span>
      ) : (
        <span>🚀 You’re a focused achiever.</span>
      )}
    </div>

    {/* Minimal Progress Bar */}
    <div className="progress-wrapper">
      <div className="progress-bar">
        <div
          className="reward-progress-fill"
          style={{ 
            width: `${Math.min(rewards.length * 10, 100)}%`,
            backgroundColor: '#2ecc71',
            height: '100%',
            borderRadius: '10px',
            transition: 'width 0.3s ease'
          }}
        ></div>
      </div>
      <span className="progress-label">
        {rewards.length} actions completed
      </span>
    </div>

    {/* Clean List */}
    <ul className="reward-list premium">
      {rewards.slice(-5).map((reward, idx) => (
        <li key={idx} className="reward-item">
          <span>✔ {reward}</span>
        </li>
      ))}
    </ul>

    {/* Milestone (less noisy, more meaningful) */}
    {rewards.length > 0 && rewards.length % 5 === 0 && (
      <div className="milestone">
        🎉 Milestone reached — {rewards.length} actions completed
      </div>
    )}
  </div>
</div>
      </div>
    </div>
  );
  

}  
 
export default App;
