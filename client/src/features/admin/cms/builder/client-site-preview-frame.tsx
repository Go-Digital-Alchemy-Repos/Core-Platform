import { useEffect, useMemo, useRef } from "react";
import {
  clientSitePreviewMessageSchema,
  type ClientSitePreviewMessage,
} from "@shared/client-site-preview";

interface ClientSitePreviewFrameProps {
  src: string;
  title: string;
  message: ClientSitePreviewMessage;
  className?: string;
}

export function ClientSitePreviewFrame({
  src,
  title,
  message,
  className,
}: ClientSitePreviewFrameProps): JSX.Element {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const targetOrigin = useMemo(() => new URL(src).origin, [src]);
  const validatedMessage = useMemo(() => clientSitePreviewMessageSchema.parse(message), [message]);

  const sendPreview = () => {
    frameRef.current?.contentWindow?.postMessage(validatedMessage, targetOrigin);
  };

  useEffect(sendPreview, [targetOrigin, validatedMessage]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      className={className}
      sandbox="allow-same-origin allow-scripts"
      onLoad={sendPreview}
      data-testid="client-site-preview-frame"
    />
  );
}
