'use client';


// Declare a global interface to add the webkitSpeechRecognition property to the Window object
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}
import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import CodeEditorWindow from "./CodeEditorWindow";
import axios from "axios";
// import { classnames } from "../utils/general";
import { languageOptions } from "../constants/languageOptions";
import { problemsList } from "../constants/problemsList";

import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import defineTheme from "../lib/defineTheme";
import useKeyPress from "../hooks/useKeyPress";
// import Footer from "./Footer";
import OutputWindow from "./OutputWindow";
// import CustomInput from "./CustomInput";
import OutputDetails from "./OutputDetails";
import ThemeDropdown from "./ThemeDropdown";
import LanguagesDropdown from "./LanguagesDropdown";
import ProblemDropdown from "./problems/ProblemDropdown";
// import Icons from "../icons";
import RunButton from "./RunButton";
import RecordButton from "./RecordButton";

import { saveAndPlayAudio, openVoiceDatabase } from '../api/text-to-speech/utils/indexdb.js';

import { faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import loader from '../lib/loader';
import myImage from '../assets/me.jpeg';
import myGif from '../assets/circle.gif';
import './styles.css';
import { useUser } from '@clerk/nextjs';

const pythonDefault = `print("Hello World")`;

export default function Landing() {
  
  const [code, setCode] = useState(problemsList[0].value);
  const [customInput, setCustomInput] = useState("");
  const [outputDetails, setOutputDetails] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [theme, setTheme] = useState({ value: "active4d", label: "Active4D" });
  const [language, setLanguage] = useState(languageOptions[2]);
  const [selectedProblem, setSelectedProblem] = useState(problemsList[0]);
  const [showExecutionLog, setShowExecutionLog] = useState(false);
  const [executionLogHeight, setExecutionLogHeight] = useState(200);
  const [resizing, setResizing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const [playInitialPrompt, setPlayInitialPrompt] = useState(false);

  const [interviewerState, setInterviewerState] = useState({
    isThinking: false,
    isSpeaking: false,
    isListening: false,
  });

  // check interview state and return string
  const getInterviewState = () => {
    if (interviewerState.isThinking) {
      return 'Thinking...';
    } else if (interviewerState.isSpeaking) {
      return 'Speaking...';
    } else if (interviewerState.isListening) {
      return 'Listening...';
    } else {
      return 'Idle...';
    }
  };


  const enterPress = useKeyPress("Enter");
  const ctrlPress = useKeyPress("Control");

  const onLanguageChange = (sl:any) => {
    console.log("selected Option...", sl);
    setLanguage(sl);
  };

  const onProblemChange = async (selectedProblem:any) => {
    console.log("selected Option...", selectedProblem);
    setSelectedProblem(selectedProblem);
    setCode(selectedProblem.value);
      setInterviewerState({
        isThinking: true,
        isSpeaking: false,
        isListening: false,
      });
    await prepareInitialPromptForSpeech();
  };

  useEffect(() => {
    if (enterPress && ctrlPress) {
      console.log("enterPress", enterPress);
      console.log("ctrlPress", ctrlPress);
      handleCompile();
    }
  }, [ctrlPress, enterPress]);
  const onChange = (action:any, data:any) => {
    switch (action) {
      case "code": {
        setCode(data);
        break;
      }
      default: {
        console.warn("case not handled!", action, data);
      }
    }
  };

  const handleAgent = () => {
    alert("The agent is not available at the moment");
  };
  
  const handleCompile = () => {
    // Check if the API call limit has been reached
    const apiCallLimit = 2;
    const apiCallLimitDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTimestamp = new Date().getTime();
    
    if (localStorage.getItem("apiCallCount")) {
      const apiCallCount = parseInt(localStorage.getItem("apiCallCount")!);
      const firstApiCallTime = parseInt(localStorage.getItem("firstApiCallTime")!);
      
      if (apiCallCount >= apiCallLimit && currentTimestamp - firstApiCallTime < apiCallLimitDuration) {
        // API call limit reached, show an error message
        showErrorToast("API call limit reached. Please wait for 5 minutes before making more API calls.", 1000);
        return;
      }
    } else {
      // Set the initial values in local storage
      localStorage.setItem("apiCallCount", "0");
      localStorage.setItem("firstApiCallTime", currentTimestamp.toString());
    }
  
    // Increment the API call count in local storage
    const apiCallCount = parseInt(localStorage.getItem("apiCallCount")!);
    localStorage.setItem("apiCallCount", (apiCallCount + 1).toString());
  
    // Proceed with the API call
    setProcessing(true);
    const formData = {
      language_id: language.id,
      // encode source code in base64
      source_code: btoa(code),
      stdin: btoa(customInput),
    };
    const options = {
      method: "POST",
      url: process.env.NEXT_PUBLIC_RAPID_API_URL,
      params: { base64_encoded: "true", wait: 'false', fields: "*" },
      headers: {
        "content-type": "application/json",
        "Content-Type": "application/json",
        "X-RapidAPI-Host": process.env.NEXT_PUBLIC_RAPID_API_HOST,
        "X-RapidAPI-Key": process.env.NEXT_PUBLIC_RAPID_API_KEY,
      },
      data: formData,
    };
  
    axios
      .request(options)
      .then(function (response) {
        console.log("res.data", response.data);
        const token = response.data.token;
        checkStatus(token);
      })
      .catch((err) => {
        let error = err.response ? err.response.data : err;
        // get error status
        let status = err.response.status;
        console.log("status", status);
        if (status === 429) {
          console.log("too many requests", status);
  
          showErrorToast(
            `Quota of 50 requests exceeded for the Day!`,
            10000
          );
        }
        setProcessing(false);
        console.log("catch block...", error);
      });
    };
  

  const checkStatus = async (token:string) => {
    const options = {
      method: "GET",
      url: process.env.NEXT_PUBLIC_RAPID_API_URL + "/" + token,
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "X-RapidAPI-Host": process.env.NEXT_PUBLIC_RAPID_API_HOST,
        "X-RapidAPI-Key": process.env.NEXT_PUBLIC_RAPID_API_KEY,
      },
    };
    try {
      let response = await axios.request(options);
      let statusId = response.data.status?.id;

      // Processed - we have a result
      if (statusId === 1 || statusId === 2) {
        // still processing
        setTimeout(() => {
          checkStatus(token);
        }, 2000);
        return;
      } else {
        setProcessing(false);
        setOutputDetails(response.data);
        showSuccessToast(`Compiled Successfully!`);
        console.log("response.data", response.data);
        return;
      }
    } catch (err) {
      console.log("err", err);
      setProcessing(false);
      showErrorToast(`Something went wrong! Please try again.`, 1000);
    }
  };

  function handleThemeChange(th:any) {
    const theme = th;
    console.log("theme...", theme);

    if (["light", "vs-dark"].includes(theme.value)) {
      setTheme(theme);
    } else {
      defineTheme(theme.value).then((_) => setTheme(theme));
    }
  }
  
  useEffect(() => {
    defineTheme("active4d").then((_) =>
      setTheme({ value: "active4d", label: "Active4D" })
    );
    showSuccessToast("Welcome to Code Editor!");
  }, []);

  const showSuccessToast = (msg:string) => {
    toast.success(msg || `Compiled Successfully!`, {
      position: "top-right",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };
  const showErrorToast = (msg:string, timer:any) => {
    toast.error(msg || `Something went wrong! Please try again.`, {
      position: "top-right",
      autoClose: timer ? timer : 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };
  const showInfoToast = (msg:string) => {
    toast.info(msg || `Processing your request...`, {
      position: "top-right",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  useEffect(() => {
    if (resizing) {
      const handleMouseMove = (event: any) => {
        const newHeight = window.innerHeight - event.clientY;
        const clampedHeight = Math.max(100, Math.min(newHeight, 500));
        setExecutionLogHeight(clampedHeight);
      };
      
  
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
  
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizing]);

  const toggleExecutionLog = () => {
    setShowExecutionLog(!showExecutionLog);
  };

  const handleMouseDown = (event:any) => {
    setResizing(true);
  };
  
  const handleMouseUp = () => {
    setResizing(false);
  };


  // ----------------------------
  // some testing stuff
  const systemPrompt = "You are a helpful assistant that provides useful information to people in need. Your answer should be concise and informative.";
  const dummyQuery = "What is the capital of France?";

  const prepareInitialPromptForSpeech = async () => {
    const currentUser = user?.fullName || 'Dear';
    const currentProblem = selectedProblem?.label || 'problem';
    const currentProblemContent = selectedProblem?.value || 'problem content';
    const tempInstr = `
    ${systemPrompt}
    \nYou will be given a [New Problem] that you should paraphrase and return. Your paraphrased problem statement should be concise and informative. It should be a clear and accurate representation of the original problem statement. If you need example paraphrases, you can refer to the examples provided below. Below you can find the [example actual Problem Statement] and [example Paraphrased Problem Statement].\n
    [example actual Problem Statement]\n${currentProblemContent}\n\n[example Paraphrased Problem Statement]\nWrite a function to calculate the sum of numbers in an array while ignoring sections starting with a 7 and ending with the next 8.
    `;

    const paraphrasedProblemStatement = await generateReply(currentProblemContent, tempInstr);
    console.log('Paraphrased Problem Statement:', paraphrasedProblemStatement);

    const initialPromptSpeech = `Welcome, ${currentUser}! I'm Wei Bing Tan, and I'm currently a Senior Software Engineer at Snapchat. Today, we'll be working on the ${currentProblem} problem, where ${paraphrasedProblemStatement}. Please take a minute to read the problem and respond when you're ready to work on it.`;
    console.log('Initial Prompt Speech:', initialPromptSpeech);

    // Convert the initial prompt to speech and play it
    await textToSpeech(initialPromptSpeech);
  };

  const [userInteracted, setUserInteracted] = useState(false);

  // turn on in production only

  // useEffect(() => {
  //   const handleUserInteraction = () => {
  //     setUserInteracted(true);
  //     window.removeEventListener('click', handleUserInteraction);
  //   };

  //   window.addEventListener('click', handleUserInteraction);

  //   return () => {
  //     window.removeEventListener('click', handleUserInteraction);
  //   };
  // }, []);

  useEffect(() => {
    if (userInteracted) {
      setInterviewerState({
        isThinking: true,
        isSpeaking: false,
        isListening: false,
      });
      prepareInitialPromptForSpeech();
    }
  }, [userInteracted]);

  const preparePromptForSpeech = () => {
    const currentUser = user?.fullName || 'Dear';
  };

  // State variables for speech recognition
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Reference to store the SpeechRecognition instance
  const recognitionRef = useRef<any>(null);
  // Start Recording
  const startRecording = () => {
    setIsRecording(true);
    setRecordingComplete(false);
    setTranscript('');

    recognitionRef.current = new window.webkitSpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event:any) => {
      const { transcript } = event.results[event.results.length - 1][0];
      console.log('Speech recognition result:', event.results);
      setTranscript(transcript);
    };

    recognitionRef.current.onerror = (event:any) => {
      console.error('Speech recognition error', event.error);
      alert('Speech recognition error: ' + event.error);
      setIsRecording(false);
    };

    // recognitionRef.current.onend = () => {
    //   setIsRecording(false);
    //   setRecordingComplete(true);
    //   console.log('Recording complete');
    //   console.log('Transcript:', transcript);

    //   if (transcript.length > 0) {
    //     handleAIResponse(transcript);
    //   } else {
    //     alert('No speech detected. Please try again.');
    //   }
    // };

    recognitionRef.current.start();
  };

  // useEffect(() => {
  //   // check whether transcript has word "done". If yes then stop recording
  //   if (transcript.toLowerCase().includes('stop')) {
  //     setIsRecording(false);
  //     setRecordingComplete(true);
  //     console.log('Recording complete');
  //     console.log('Transcript:', transcript);

  //     if (transcript.length > 0) {
  //       // send without "done" word
  //       handleAIResponse(transcript.replace('stop', ''));
  //     } else {
  //       alert('No speech detected. Please try again.');
  //     }
  //   }
  // }, [transcript]);

  // Stop Recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      handleAIResponse(transcript);
    }
  };

  // Toggle Recording
  const handleToggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // ================================================
  // cookin ai stuff...
  // Update handleAIResponse function
  const handleAIResponse = async (userQuery:string) => {
    console.log('Handling AI response...');
    showInfoToast('Processing your request...');
    try {
      setIsProcessing(true);
      // Show some loading state if needed
      console.log('Sending user query to AI:', userQuery);

      // Send the transcribed text to the GPT-4o model
      const aiReply = await generateReply(userQuery, systemPrompt);
      // const aiReply = await generateReplyPaper(userQuery);

      console.log('AI Reply:', aiReply);

      // Convert the AI reply to speech and play it
      await textToSpeech(aiReply);
    } catch (error) {
      console.error('Error handling AI response:', error);
      showErrorToast('An error occurred while processing your request.', 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  // send request to gpt-4o
  // generate reply for user query
  // Existing generateReply function
  const generateReply = async (prompt:string, systemPrompt:string) => {
    console.log('Generating reply...');
    try {
      // query-model
      const response = await fetch('/api/query-gpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, systemPrompt }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching the reply.');
      return 'No response available';
    }
  };

  // when we get reply from gpt-4o model then we will convert it to voice and play it

  // send request to elevenlabs api
  // text to speech
  // Modify your existing textToSpeech function to accept dynamic text
  const textToSpeech = async (text: string) => {
    console.log('Converting text to speech...');
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const blob = await response.blob();

      // Save to IndexedDB and play
      setInterviewerState({
        isThinking: false,
        isSpeaking: true,
        isListening: false,
      });
      await saveAndPlayAudio(blob);
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching the audio.');
    } finally {
      startRecording();
      setInterviewerState({
        isThinking: false,
        isSpeaking: false,
        isListening: true,
      });
    }
  };

  // animation

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div className="flex flex-col sm:flex-row">
        <div className="px-4 py-2">
          <ProblemDropdown onSelectChange={onProblemChange} />
        </div>
        <div className="px-4 py-2">
          <LanguagesDropdown onSelectChange={onLanguageChange} />
        </div>
        <div className="px-4 py-2">
          <ThemeDropdown handleThemeChange={()=>{}} theme={theme} />
        </div>
        <div className="px-4 py-2">
          <RunButton handleCompile={language.id !== 43 ? handleCompile : handleAgent} code={code} processing={processing}/>
        </div>
        <div className="px-4 py-2">
          <button className="border-2 border-black z-10 rounded-md shadow-[5px_5px_0px_0px_rgba(0,0,0)] px-4 py-2 hover:shadow transition duration-200 bg-white flex-shrink-0" onClick={toggleExecutionLog}>
            Execution Log {<FontAwesomeIcon icon={faTerminal} />}
          </button>
        </div>
        <div className="px-4 py-2">
          <RecordButton handleRecord={()=>{generateReply(dummyQuery, systemPrompt)}} processing={isRecording}/>
        </div>
      </div>
      <div className="flex flex-col h-full">
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 items-start px-4 py-4">
          <div className="flex flex-row w-full h-full justify-start items-center">
            <CodeEditorWindow
              code={code}
              onChange={onChange}
              language={language?.value}
              theme={theme.valueOf()}
            />
{/* interviewer window */}
<div className="flex flex-col items-center justify-center text-center w-[20%]">
  <div className="flex flex-col text-center items-center justify-center gap-2 noselect">
    {/* Circular GIF background with image on top */}
    <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg">
      {/* GIF background */}
      <div className="absolute inset-0 w-[142%] h-[142%] mt-[-25px] ml-[-25px] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(/circle.gif)` }}>
      </div>
      {/* Image layered on top */}
      <Image
        priority={true}
        src={myImage}
        width={80}
        height={80}
        alt="Interviewer"
        className="relative w-24 h-24 rounded-full shadow-md nodrag top-4 left-4"
        title="Interviewer"
      />
    </div>
    <p className="text-lg font-bold">Ibrohim Abdivokhidov</p>
    <p>{getInterviewState()}</p>
  </div>
</div>

          </div>
        </div>
      </div>
    <div className="relative">
      {showExecutionLog && (
        <>
          <div
            className={`fixed left-0 right-0 bottom-0 bg-white border-t border-gray-300 overflow-y-auto z-50 ${
              resizing ? "pointer-events-none" : ""
            }`}
            style={{ height: `${executionLogHeight + 1}px`, cursor: "row-resize", }}
            onMouseDown={handleMouseDown}
          ></div>
          <div
            className="fixed left-0 right-0 bottom-0 bg-white border-gray-300 overflow-y-auto z-50"
            style={{ height: `${executionLogHeight}px`, maxHeight: "500px", minHeight: "100px", }}
          >
            <div className="">
              <OutputWindow outputDetails={outputDetails} />
              {outputDetails && <OutputDetails outputDetails={outputDetails} />}
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
};