"use client";

// import { useEffect,useState  } from "react";

interface ProgressCircleProps {
    progress : number
}

export default function ProgressCircle({progress}: ProgressCircleProps) {
//   const [progress, setProgress] = useState(40); 
//   const [running, setRunning] = useState(false);

//   useEffect(() => {
//     let interval: NodeJS.Timeout | null = null;

//     if (running) {
//       let value = 0;
//       interval = setInterval(() => {
//         if (value > 100) {
//           if (interval) clearInterval(interval);
//           setRunning(false);
//           return;
//         }
//         setProgress(value);
//         value++;
//       }, 50);
//     }

//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [running]);

  return (
    
    
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-live="polite"
        style={{
          ["--progress" as any]: `${progress}%`,
        }}
        className="progressbar"
      >
       
      </div>


    
  );
}
