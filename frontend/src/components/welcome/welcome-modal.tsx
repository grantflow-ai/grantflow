/* eslint-disable sonarjs/no-nested-conditional */
"use client";


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { PROGRESS_BAR_STEPS } from "@/constants";
import { AppButton } from "../app-button";

export default function WelcomeModal() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(1);



  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < PROGRESS_BAR_STEPS.length ? prev + 1 : 1));
    }, 2000);

    const hasVisited = localStorage.getItem("hasVisitedWelcomeModal");
    if (!hasVisited) {
      setOpen(true);
      localStorage.setItem("hasVisitedWelcomeModal", "true");
    }

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="flex w-full max-w-[954px] flex-col gap-16 overflow-hidden rounded-sm border border-[#1f13f8cf] bg-white px-0 pb-8 pt-0">
        <DialogHeader className="relative flex h-[152px] w-full items-center justify-center overflow-hidden rounded-t-sm bg-[#FAF9FB]">
          <div className="absolute -left-32 top-40 size-64 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_#1E13F8_0%,_transparent_70%)] opacity-80" />
          <figure className="flex flex-col items-center justify-center gap-4">
            {/* Progress Bar */}
            <main className="flex items-center">
              {PROGRESS_BAR_STEPS.map((_, index) => (
                <div
                  className={`${
                    index < PROGRESS_BAR_STEPS.length - 1 ? "w-[145px]" : ""
                  } flex items-center`}
                  key={index}
                >
                  <motion.div
                    animate={
                      index < step
                        ? "active"
                        : index === step
                        ? "next"
                        : "inactive"
                    }
                    className="size-[11px] rounded-full flex justify-center items-center border"
                    initial="inactive"
                    style={{
                      borderColor:
                        index === step
                          ? "var(--app-primary-blue)"
                          : index < step
                          ? "transparent"
                          : "#E5E7EB",
                    }}
                    transition={{ duration: 0.5 }}
                    variants={{
                      active: { backgroundColor: "var(--app-primary-blue)", scale: 1.1 },
                      next: { backgroundColor: "transparent", scale: 1 },
                      inactive: { backgroundColor: "transparent", scale: 1 },
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {index < step ? (
                        <motion.div
                          animate="active"
                          className="flex items-center justify-center"
                          exit="hidden"
                          initial="hidden"
                          key={`check-${index}`}
                          style={{ transform: "translate(-0.5px, -0.5px)" }}
                          transition={{ delay: 0.3, duration: 0.3 }}
                          variants={{
                            active: { opacity: 1, scale: 1 },
                            hidden: { opacity: 0, scale: 0 },
                          }}
                        >
                          <Check className="size-[7px] stroke-[5] text-white" />
                        </motion.div>
                      ) : // eslint-disable-next-line sonarjs/no-nested-conditional
                      index === step ? (
                        <motion.div
                          animate="active"
                          className="size-[3.5px] rounded-full bg-primary"
                          exit="hidden"
                          initial="hidden"
                          key={`dot-${index}`}
                          style={{
                           
                            transform: "translate(0, -0.5px)",
                          }}
                          transition={{ duration: 0.5 }}
                          variants={{
                            active: { opacity: 1, scale: 1 },
                            hidden: { opacity: 0, scale: 0 },
                          }}
                        />
                      ) : null}
                    </AnimatePresence>
                  </motion.div>

                  {/* Animated Line */}
                  {index < PROGRESS_BAR_STEPS.length - 1 && (
                    <div className="relative h-px w-full overflow-hidden bg-gray-200">
                      {index === step - 1 ? (
                        <motion.div
                          animate={{ width: "100%" }}
                          className="absolute left-0 top-0 h-full bg-primary"
                          initial={{ width: 0 }}
                          key={`line-${index}`}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                        />
                      ) : // eslint-disable-next-line sonarjs/no-nested-conditional
                      index < step - 1 ? (
                        <div className="absolute left-0 top-0 size-full bg-primary" />
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </main>

            {/* Labels */}
            <main className="flex w-[839px] items-center justify-between">
              {PROGRESS_BAR_STEPS.map((label, index) => (
                <h5
                  className={`text-[11px] font-semibold ${
                    index < step - 1
                      ? "text-app-dark-blue"
                      : // eslint-disable-next-line sonarjs/no-nested-conditional
                      index === step - 1
                      ? "text-primary"
                      : "text-gray-400"
                  }`}
                  key={index}
                >
                  {label}
                </h5>
              ))}
            </main>
          </figure>
        </DialogHeader>
        <section className=" flex w-full justify-between px-10">
          <DialogTitle>
            <h2 className="text-4xl font-medium text-black ">
              Welcome to <br /> GrantFlow!
            </h2>
          </DialogTitle>

          <DialogDescription className="flex w-[597px] flex-col gap-10">
            <div className="flex flex-col gap-4">
              <p className="text-base font-normal text-black ">
                <span className="font-semibold"> GrantFlow</span> was built for
                researchers, designed to save dozens of hours and bring you
                closer to submission, quickly and efficiently.
              </p>
              <p className="text-base font-normal text-black ">
                Powered by AI, the system will generate a draft application
                tailored to your needs based on the materials and information
                you provide. The more accurate and detailed your input, the
                closer the result will be to what you need.
              </p>
            </div>
            <article className="flex gap-1 rounded-lg border border-app-slate-blue bg-light-gray p-2">
              <div className="size-4">
                <AlertCircle className="text-gray-700 size-4" />
              </div>
              <p className="text-sm font-normal text-black ">
                Keep in mind that AI has limitations and may occasionally make
                mistakes. Always review and refine the output using the editor.
              </p>
            </article>
          </DialogDescription>
        </section>
        <footer className="flex w-full items-center justify-between px-10">
          <AppButton
          variant="secondary"
            onClick={() => setOpen(false)}
            className="w-28  px-4 py-2 "
          >
            Later
          </AppButton>
          <AppButton
            className="  px-4 py-2 "
            variant="primary"
            onClick={() => setOpen(false)}
          >
            Start New Application
          </AppButton>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
