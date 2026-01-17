import { useCallback } from 'react';
import { MessageRequest, MessageResponse } from '../types';

export const useChromeMessaging = () => {
  const sendMessage = useCallback(async (message: MessageRequest): Promise<MessageResponse> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response: MessageResponse) => {
        resolve(response);
      });
    });
  }, []);

  return { sendMessage };
};
