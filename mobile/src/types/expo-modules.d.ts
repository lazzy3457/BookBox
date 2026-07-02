declare module "expo-constants" {
  const Constants: {
    expoConfig?: {
      extra?: {
        eas?: {
          projectId?: string;
        };
      };
    };
    easConfig?: {
      projectId?: string;
    };
  };

  export default Constants;
}

declare module "expo-notifications" {
  export const AndroidImportance: {
    MAX: number;
  };

  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<{
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner: boolean;
      shouldShowList: boolean;
    }>;
  }): void;

  export function getPermissionsAsync(): Promise<{ status: string }>;
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function setNotificationChannelAsync(
    name: string,
    channel: { name: string; importance: number; description?: string; vibrationPattern?: number[]; lightColor?: string }
  ): Promise<void>;
  export function getExpoPushTokenAsync(options: { projectId: string }): Promise<{ data: string }>;
  export function addNotificationResponseReceivedListener(
    listener: (response: { notification: { request: { content: { data?: Record<string, unknown> } } } }) => void
  ): { remove: () => void };
  export function getLastNotificationResponseAsync(): Promise<{
    notification: { request: { content: { data?: Record<string, unknown> } } };
  } | null>;
}
