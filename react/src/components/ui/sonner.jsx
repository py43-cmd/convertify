import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500 dark:text-emerald-400" />,
        info: <InfoIcon className="size-4 text-indigo-500 dark:text-indigo-400" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500 dark:text-amber-400" />,
        error: <OctagonXIcon className="size-4 text-red-500 dark:text-red-400" />,
        loading: <Loader2Icon className="size-4 animate-spin text-indigo-600 dark:text-indigo-400" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group-[.toaster]:bg-white dark:group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-900 dark:group-[.toaster]:text-slate-100 group-[.toaster]:border-slate-200 dark:group-[.toaster]:border-slate-800 group-[.toaster]:shadow-lg rounded-[14px]",
          description: "group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400",
          actionButton: "group-[.toast]:bg-indigo-600 group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-900",
        }
      }}
      {...props} />
  );
}

export { Toaster }
