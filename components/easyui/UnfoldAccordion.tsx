"use client";

// Adapted from EasyUI UnfoldAccordion by Suraj Maurya (MIT).
// https://github.com/Surajmaurya1/easyui/blob/main/src/components/ui/UnfoldAccordion.tsx
import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface UnfoldAccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface UnfoldAccordionProps {
  items: UnfoldAccordionItem[];
  className?: string;
  reducedMotion?: boolean;
}

export function UnfoldAccordion({ items, className, reducedMotion = false }: UnfoldAccordionProps) {
  const id = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={cn("easyui-unfold-accordion", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        const triggerId = `${id}-${item.id}-trigger`;
        const regionId = `${id}-${item.id}-region`;
        return (
          <div key={item.id} className="easyui-unfold-item">
            <button
              id={triggerId}
              type="button"
              aria-expanded={open}
              aria-controls={open ? regionId : undefined}
              onClick={() => setOpenId(open ? null : item.id)}
              className="easyui-unfold-trigger"
            >
              <span>{item.title}</span>
              <motion.span
                aria-hidden="true"
                animate={{ rotate: open && !reducedMotion ? 180 : open ? 180 : 0 }}
                transition={
                  reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 28 }
                }
              >
                <CaretDown size={16} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id={regionId}
                  role="region"
                  aria-labelledby={triggerId}
                  key="content"
                  initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={
                    reducedMotion
                      ? { opacity: 0, transition: { duration: 0 } }
                      : { height: 0, opacity: 0 }
                  }
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 300, damping: 34 }
                  }
                  className="easyui-unfold-content"
                >
                  <div className="easyui-unfold-inner">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
