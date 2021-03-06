import { toast } from "react-hot-toast";

export function errorNotification(message: string) {
  return toast.error(<b>{message.toString()}</b>, {
    position: "bottom-center",
    style: {
      background: "#de938d",
      padding: "16px",
    },
  });
}

export function loadingNotification(message: string) {
  return toast.loading(message.toString(), {
    position: "bottom-center",
    className: "font-semibold",
    style: {
      background: "#94a4bb",
      padding: "16px",
    },
  });
}

export function dismissNotification(notification?: string) {
  return toast.dismiss(notification ?? undefined);
}
