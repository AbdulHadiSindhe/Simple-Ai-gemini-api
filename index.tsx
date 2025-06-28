import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

const MessageSender = {
  USER: 'user',
  AI: 'ai',
};

// Replace this with your actual API key
const API_KEY = "AIzaSyDKNrE_coOxHFQdc94hLz5lcfUbSdb5x8k";

if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
  console.error("Please set your Gemini API key in the API_KEY variable");
}

const ai = new GoogleGenAI(API_KEY);

const TEXT_MODEL_NAME = "gemini-1.5-flash";
const IMAGE_MODEL_NAME = "imagen-3.0-generate-001";

const SYSTEM_INSTRUCTION = `You are an AI assistant.
If the user asks you to generate, create, or make an image, photo, or picture of something, respond *only* with the text '/image' followed by a detailed description of the image they want.
For example, if they ask for 'a picture of a cat wearing a hat', you should respond with '/image a detailed, photorealistic image of a small tabby cat wearing a tiny blue knitted hat, sitting on a sunlit windowsill'.
Do not add any other conversational text or apologies before or after the /image command.

When providing code examples, you MUST use Markdown code blocks. Start the block with triple backticks and the language (e.g., \`\`\`javascript). End the block with triple backticks. Any explanatory text should precede the code block. No text should follow the code block's closing triple backticks.

If asked "What is your name?", respond with "my name is Abdul Hadi." and nothing else.
If asked who made you, or who your creator is, respond with 'Abdul Hadi.' and nothing else.

For all other queries, respond naturally and helpfully.`;

async function generateTextContent(prompt: string) {
  try {
    const model = ai.getGenerativeModel({ 
      model: TEXT_MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.trim();

  } catch (error) {
    console.error("Error generating text content:", error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            throw new Error("Invalid API Key. Please check your Gemini API key.");
        }
         if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            throw new Error("API rate limit exceeded or quota reached. Please try again later.");
        }
    }
    throw new Error("Failed to generate text content from AI.");
  }
}

async function generateImage(prompt: string) {
  try {
    const model = ai.getGenerativeModel({ model: IMAGE_MODEL_NAME });
    
    const result = await model.generateContent([
      { text: prompt }
    ]);
    
    const response = await result.response;
    // Note: Image generation API structure may vary
    // This is a simplified version - you may need to adjust based on actual API
    return { base64ImageBytes: "placeholder" }; // Placeholder for now

  } catch (error) {
    console.error("Error generating image:", error);
     if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            throw new Error("Invalid API Key. Please check your Gemini API key.");
        }
         if (error.message.includes('429') || error.message.toLowerCase().includes('quota')) {
            throw new Error("API rate limit exceeded or quota reached for image generation. Please try again later.");
        }
         if (error.message.toLowerCase().includes('prompt blocked')) {
            throw new Error("The image prompt was blocked due to safety policies. Please try a different prompt.");
        }
    }
    throw new Error("Failed to generate image from AI.");
  }
}

interface CodeBlock {
  language?: string;
  content: string;
}

interface MessageImage {
  src: string;
  alt: string;
  prompt: string;
}

interface Message {
  id: number;
  sender: string;
  text?: string;
  image?: MessageImage;
  codeBlock?: CodeBlock;
  timestamp: Date;
}

const CodeBlockDisplay: React.FC<{ codeBlock: CodeBlock }> = ({ codeBlock }) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeBlock.content);
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
      setCopyButtonText('Error');
      setTimeout(() => setCopyButtonText('Copy'), 2000);
    }
  };

  return (
    <div className="bg-gray-800 rounded-md my-2 relative">
      {codeBlock.language && (
        <span className="absolute top-0 left-2 text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded-b-md z-10">
          {codeBlock.language}
        </span>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded z-10"
        aria-label="Copy code to clipboard"
      >
        <i className={`fas ${copyButtonText === 'Copied!' ? 'fa-check' : (copyButtonText === 'Error' ? 'fa-times' : 'fa-clipboard')} mr-1`}></i>
        {copyButtonText}
      </button>
      <pre className="p-3 pt-8 sm:pt-4 overflow-x-auto">
        <code className={`language-${codeBlock.language || 'plaintext'} font-mono text-sm text-gray-200`}>
          {codeBlock.content}
        </code>
      </pre>
    </div>
  );
};

const ImageBubble: React.FC<{ src: string; alt: string; prompt: string; onClick: () => void }> = ({ src, alt, prompt, onClick }) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src;
    link.download = `${prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'generated-image'}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-2 relative group cursor-pointer" onClick={onClick}>
      <img 
        src={src} 
        alt={alt} 
        className="rounded-lg max-w-full h-auto max-h-64 object-contain shadow-lg border-2 border-gray-500 group-hover:border-pink-400 transition-colors" 
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
        <i className="fas fa-search-plus text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity"></i>
      </div>
       <button
        onClick={handleDownload}
        title="Download image"
        className="absolute bottom-2 right-2 p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Download image"
      >
        <i className="fas fa-download"></i>
      </button>
    </div>
  );
};

const MessageItem: React.FC<{ message: Message; onImageClick: (image: MessageImage) => void }> = ({ message, onImageClick }) => {
  const isUser = message.sender === MessageSender.USER;

  const baseClasses = "max-w-[85%] sm:max-w-[80%] rounded-t-2xl px-4 py-2.5 shadow-md break-words transition-all duration-300 ease-in-out";
  const userClasses = `ml-auto text-white user-message-gradient rounded-bl-2xl ${baseClasses}`;
  const aiClasses = `mr-auto text-slate-700 ai-message-gradient rounded-br-2xl ${baseClasses}`;
  
  const containerClasses = isUser ? userClasses : aiClasses;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={containerClasses}>
        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
        {message.image && (
          <ImageBubble 
            src={message.image.src} 
            alt={message.image.alt} 
            prompt={message.image.prompt}
            onClick={() => onImageClick(message.image)} 
          />
        )}
        {message.codeBlock && (
          <CodeBlockDisplay codeBlock={message.codeBlock} />
        )}
      </div>
    </div>
  );
};

const MessageList: React.FC<{ messages: Message[]; onImageClick: (image: MessageImage) => void }> = ({ messages, onImageClick }) => {
  const chatboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div id="chatbox" ref={chatboxRef} className="flex-grow overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} onImageClick={onImageClick} />
      ))}
    </div>
  );
};

const Header: React.FC = () => {
  return (
    <div className="gradient-header py-4 px-4 flex justify-center items-center w-full fixed top-0 left-0 right-0 z-20 shadow-md">
      <div className="flex items-center">
        <svg 
          viewBox="0 0 200 200" 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-10 w-10 mr-4 text-white"
          aria-label="AHS company logo"
          role="img"
        >
            <title>AHS Logo</title>
            <desc>A logo depicting two overlapping five-pointed stars within a circle.</desc>
            <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="10"/>
            <path d="M 100,31 L 115,75 L 165,75 L 125,105 L 140,155 L 99,120 L 60,155 L 75,105 L 35,75 L 85,75 Z"
                  fill="none" stroke="currentColor" strokeWidth="8"/>
            <path d="M 98,31 L 115,75 L 165,75 L 123,106 L 140,155 L 98,124 L 60,155 L 70,105 L 36,80 L 82,75 Z"
                  fill="none" stroke="currentColor" strokeWidth="8" 
                  transform="rotate(36 100 100)"/>
        </svg>
        <h1 className="text-white text-xl font-bold">AI BY A . H . S</h1>
      </div>
    </div>
  );
};

const ChatInputForm: React.FC<{
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  isAiResponding: boolean;
  isListening: boolean;
  onToggleListen: () => void;
}> = ({ inputValue, onInputChange, onSendMessage, isAiResponding, isListening, onToggleListen }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAiResponding) { 
        onSendMessage();
    }
  };

  const getPlaceholderText = () => {
    if (isAiResponding) return "AI is thinking...";
    if (isListening) return "Listening...";
    return "Type your message or ask for an /image...";
  };

  const isInputDisabled = isListening || isAiResponding;
  const isSendButtonDisabled = (!inputValue.trim() && !isListening) || isAiResponding;
  const isMicButtonDisabled = isAiResponding;

  return (
    <div className="p-3 sm:p-4 border-t border-gray-300 fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-gray-100 z-20 w-full">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-3">
        <div className="flex-grow relative">
          <div className="flex w-full bg-white rounded-full shadow-md overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-pink-500">
            <button
              id="micButton"
              type="button"
              onClick={onToggleListen}
              disabled={isMicButtonDisabled}
              className={`pl-3 pr-2 sm:pl-4 sm:pr-3 transition-colors duration-200 ${
                isListening ? 'text-red-500 animate-pulse' : 'text-gray-500 hover:text-pink-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={isListening ? "Stop listening" : "Start listening"}
            >
              <i className={`fas ${isListening ? 'fa-microphone-slash' : 'fa-microphone'} text-lg sm:text-xl`}></i>
            </button>
            <input
              id="chatInput"
              type="text"
              value={inputValue}
              onChange={onInputChange}
              className="w-full py-3 px-2 sm:px-3 bg-transparent text-gray-800 border-none focus:outline-none placeholder-gray-400 text-sm sm:text-base"
              placeholder={getPlaceholderText()}
              disabled={isInputDisabled}
            />
          </div>
        </div>
        <button
          id="sendButton"
          type="submit"
          disabled={isSendButtonDisabled}
          className="p-3 user-message-gradient text-white rounded-full hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12 h-12 sm:w-12 sm:h-12"
          aria-label="Send message"
        >
          <i className="fas fa-paper-plane text-lg"></i>
        </button>
      </form>
    </div>
  );
};

const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="spinner w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

const ImagePreviewModal: React.FC<{
  imageUrl: string;
  altText: string;
  promptText: string;
  onClose: () => void;
}> = ({ imageUrl, altText, promptText, onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${promptText.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'generated-image'}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white p-4 sm:p-6 rounded-xl shadow-2xl max-w-3xl max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt={altText} 
          className="max-w-full max-h-[calc(90vh-150px)] sm:max-h-[calc(90vh-120px)] object-contain rounded-lg" 
        />
        <p className="text-xs text-gray-500 mt-2 italic break-words px-2">Prompt: {promptText}</p>
        <div className="mt-4 flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
            aria-label="Download full size image"
          >
            <i className="fas fa-download mr-2"></i> Download
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
            aria-label="Close image preview"
          >
            <i className="fas fa-times mr-2"></i> Close
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [previewImage, setPreviewImage] = useState<MessageImage | null>(null);

  const recognitionRef = useRef<any>(null);

  const addMessage = useCallback((sender: string, text?: string, image?: MessageImage, codeBlock?: CodeBlock) => {
    setMessages(prev => [...prev, { id: Date.now(), sender, text, image, codeBlock, timestamp: new Date() }]);
  }, []);

  const parseAiResponse = (responseText: string) => {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/;
    const match = responseText.match(codeBlockRegex);

    if (match) {
      const language = match[1] || undefined;
      const codeContent = match[2].trim();
      const textBeforeCode = responseText.substring(0, match.index!).trim();
      
      return {
        text: textBeforeCode || undefined,
        codeBlock: { language, content: codeContent }
      };
    }
    return { text: responseText };
  };

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage = messageText.trim();
    addMessage(MessageSender.USER, userMessage);
    setInputValue('');
    setIsAiResponding(true);

    try {
      if (userMessage.toLowerCase().startsWith('/image')) {
        const imagePrompt = userMessage.substring(6).trim();
        if (imagePrompt) {
          // For now, just show a placeholder since image generation API needs proper setup
          addMessage(MessageSender.AI, "Image generation is currently being set up. Please check your API configuration.");
        } else {
          addMessage(MessageSender.AI, "Please provide a description for the image after /image.");
        }
      } else {
        const rawAiResponseText = await generateTextContent(userMessage);
        
        if (rawAiResponseText.toLowerCase().startsWith('/image')) {
          const imagePrompt = rawAiResponseText.substring(6).trim();
          addMessage(MessageSender.AI, `Okay, generating an image of: ${imagePrompt}`);
          // Image generation would go here
          addMessage(MessageSender.AI, "Image generation is currently being set up. Please check your API configuration.");
        } else {
          const { text: parsedText, codeBlock: parsedCodeBlock } = parseAiResponse(rawAiResponseText);
          if (parsedText || parsedCodeBlock) {
            addMessage(MessageSender.AI, parsedText, undefined, parsedCodeBlock);
          } else {
            addMessage(MessageSender.AI, "Received an empty response from AI.");
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      addMessage(MessageSender.AI, `Error: ${errorMessage}`);
    } finally {
      setIsAiResponding(false);
    }
  }, [addMessage]);
  
  const startSpeechRecognition = useCallback(() => {
    if (isAiResponding) return;

    const WindowSpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!WindowSpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Try Chrome or Edge.');
      return;
    }

    if (!recognitionRef.current) {
        recognitionRef.current = new WindowSpeechRecognition();
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.interimResults = false;
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: any) => {
          const speechResult = event.results[0][0].transcript;
          setInputValue(speechResult);
          handleSendMessage(speechResult); 
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          let errorMessage = "Speech recognition error.";
          if (event.error === 'no-speech') {
            errorMessage = "No speech detected. Please try again.";
          } else if (event.error === 'audio-capture') {
            errorMessage = "Microphone error. Please check your microphone.";
          } else if (event.error === 'not-allowed') {
            errorMessage = "Microphone access denied. Please allow microphone access.";
          }
          addMessage(MessageSender.AI, errorMessage);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false); 
        };
    }
    
    if (!isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setInputValue(''); 
      } catch(e) {
          console.error("Error starting speech recognition:", e);
          addMessage(MessageSender.AI, "Could not start voice listening. Please try again.");
          setIsListening(false);
      }
    } else {
      recognitionRef.current.stop();
    }
  }, [isListening, addMessage, handleSendMessage, isAiResponding]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleImageClick = (image: MessageImage) => {
    setPreviewImage(image);
  };

  const closeModal = () => {
    setPreviewImage(null);
  };

  return (
    <div className="container mx-auto min-h-screen flex flex-col items-center bg-gray-100">
      <Header />
      <div className="flex-grow flex flex-col w-full max-w-2xl overflow-hidden pt-20 pb-28 sm:pb-32 relative">
        <MessageList messages={messages} onImageClick={handleImageClick} />
         {isAiResponding && messages.length > 0 && messages[messages.length -1]?.sender === MessageSender.USER && <Spinner />}
      </div>
      <ChatInputForm
        inputValue={inputValue}
        onInputChange={(e) => setInputValue(e.target.value)}
        onSendMessage={() => handleSendMessage(inputValue)}
        isAiResponding={isAiResponding}
        isListening={isListening}
        onToggleListen={startSpeechRecognition}
      />
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage.src}
          altText={previewImage.alt}
          promptText={previewImage.prompt}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
