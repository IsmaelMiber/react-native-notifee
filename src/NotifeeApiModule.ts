/*
 * Copyright (c) 2016-present Invertase Limited
 */

import { AppRegistry } from 'react-native';
import { Module } from './types/Module';
import {
  AndroidChannel,
  AndroidChannelGroup,
  NativeAndroidChannel,
  NativeAndroidChannelGroup,
} from './types/NotificationAndroid';
import { InitialNotification, Notification, Event } from './types/Notification';
import NotifeeNativeModule, { NativeModuleConfig } from './NotifeeNativeModule';

import { isAndroid, isArray, isFunction, isIOS, isString, isUndefined } from './utils';
import validateNotification from './validators/validateNotification';
import validateAndroidChannel from './validators/validateAndroidChannel';
import validateAndroidChannelGroup from './validators/validateAndroidChannelGroup';
import {
  IOSNotificationCategory,
  IOSNotificationSettings,
  IOSNotificationPermissions,
} from './types/NotificationIOS';
import validateIOSCategory from './validators/validateIOSCategory';
import validateIOSPermissions from './validators/validateIOSPermissions';

let onNotificationEventHeadlessTaskRegistered = false;
let registeredForegroundServiceTask: (notification: Notification) => Promise<void>;

export default class NotifeeApiModule extends NotifeeNativeModule implements Module {
  constructor(config: NativeModuleConfig) {
    super(config);
    AppRegistry.registerHeadlessTask(this.native.FOREGROUND_NOTIFICATION_TASK_KEY, () => {
      if (!registeredForegroundServiceTask) {
        console.warn(
          '[notifee] no registered foreground service has been set for displaying a foreground notification.',
        );
        return (): Promise<void> => Promise.resolve();
      }
      return ({ notification }): Promise<void> => registeredForegroundServiceTask(notification);
    });
  }

  public cancelAllNotifications(): Promise<void> {
    return this.native.cancelAllNotifications();
  }

  public cancelNotification(notificationId: string): Promise<void> {
    if (!isString(notificationId)) {
      throw new Error("notifee.cancelNotification(*) 'notificationId' expected a string value.");
    }

    return this.native.cancelNotification(notificationId);
  }

  public createCategory(category: IOSNotificationCategory): Promise<string> {
    let options: IOSNotificationCategory;
    try {
      options = validateIOSCategory(category);
    } catch (e) {
      throw new Error(`notifee.createCategory(*) ${e.message}`);
    }

    if (isAndroid) {
      return Promise.resolve('');
    }

    return this.native.createCategory(options);
  }

  public createChannel(channel: AndroidChannel): Promise<string> {
    let options: AndroidChannel;
    try {
      options = validateAndroidChannel(channel);
    } catch (e) {
      throw new Error(`notifee.createChannel(*) ${e.message}`);
    }

    if (isIOS) {
      return Promise.resolve('');
    }

    if (this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve(options.id);
    }

    return this.native.createChannel(options).then(() => {
      return options.id;
    });
  }

  public createChannels(channels: AndroidChannel[]): Promise<void> {
    if (!isArray(channels)) {
      throw new Error("notifee.createChannels(*) 'channels' expected an array of AndroidChannel.");
    }

    const options: AndroidChannel[] = [];
    try {
      for (let i = 0; i < channels.length; i++) {
        options[i] = validateAndroidChannel(channels[i]);
      }
    } catch (e) {
      throw new Error(`notifee.createChannels(*) 'channels' a channel is invalid: ${e.message}`);
    }

    if (isIOS || this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve();
    }

    return this.native.createChannels(options);
  }

  public createChannelGroup(channelGroup: AndroidChannelGroup): Promise<string> {
    let options: AndroidChannelGroup;
    try {
      options = validateAndroidChannelGroup(channelGroup);
    } catch (e) {
      throw new Error(`notifee.createChannelGroup(*) ${e.message}`);
    }

    if (this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve(options.id);
    }

    if (isIOS) {
      return Promise.resolve('');
    }

    return this.native.createChannelGroup(options).then(() => {
      return options.id;
    });
  }

  public createChannelGroups(channelGroups: AndroidChannelGroup[]): Promise<void> {
    if (!isArray(channelGroups)) {
      throw new Error(
        "notifee.createChannelGroups(*) 'channelGroups' expected an array of AndroidChannelGroup.",
      );
    }

    const options = [];
    try {
      for (let i = 0; i < channelGroups.length; i++) {
        options[i] = validateAndroidChannelGroup(channelGroups[i]);
      }
    } catch (e) {
      throw new Error(
        `notifee.createChannelGroups(*) 'channelGroups' a channel group is invalid: ${e.message}`,
      );
    }

    if (isIOS || this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve();
    }

    return this.native.createChannelGroups(options);
  }

  public deleteChannel(channelId: string): Promise<void> {
    if (!isString(channelId)) {
      throw new Error("notifee.deleteChannel(*) 'channelId' expected a string value.");
    }

    if (isIOS || this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve();
    }

    return this.native.deleteChannel(channelId);
  }

  public deleteChannelGroup(channelGroupId: string): Promise<void> {
    if (!isString(channelGroupId)) {
      throw new Error("notifee.deleteChannelGroup(*) 'channelGroupId' expected a string value.");
    }

    if (isIOS || this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve();
    }

    return this.native.deleteChannelGroup(channelGroupId);
  }

  public displayNotification(notification: Notification): Promise<string> {
    let options: Notification;
    try {
      options = validateNotification(notification);
    } catch (e) {
      throw new Error(`notifee.displayNotification(*) ${e.message}`);
    }

    return this.native.displayNotification(options).then((): string => {
      return options.id as string;
    });
  }

  public getChannel(channelId: string): Promise<NativeAndroidChannel | null> {
    if (!isString(channelId)) {
      throw new Error("notifee.getChannel(*) 'channelId' expected a string value.");
    }

    if (isIOS || this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve(null);
    }

    return this.native.getChannel(channelId);
  }

  public getChannels(): Promise<NativeAndroidChannel[]> {
    if (isIOS || this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve([]);
    }

    return this.native.getChannels();
  }

  public getChannelGroup(channelGroupId: string): Promise<NativeAndroidChannelGroup | null> {
    if (!isString(channelGroupId)) {
      throw new Error("notifee.getChannelGroup(*) 'channelGroupId' expected a string value.");
    }

    if (isIOS || this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve(null);
    }

    return this.native.getChannelGroup(channelGroupId);
  }

  public getChannelGroups(): Promise<NativeAndroidChannelGroup[]> {
    if (isIOS || this.native.ANDROID_API_LEVEL < 26) {
      return Promise.resolve([]);
    }

    return this.native.getChannelGroups();
  }

  public getInitialNotification(): Promise<InitialNotification | null> {
    return this.native.getInitialNotification();
  }

  public onBackgroundEvent(observer: (event: Event) => Promise<void>): void {
    if (!isFunction(observer)) {
      throw new Error("notifee.onBackgroundEvent(*) 'observer' expected a function.");
    }

    if (isAndroid && !onNotificationEventHeadlessTaskRegistered) {
      AppRegistry.registerHeadlessTask(this.native.NOTIFICATION_EVENT_KEY, () => {
        return ({ type, detail }): Promise<void> => {
          return observer({ type, detail });
        };
      });
      onNotificationEventHeadlessTaskRegistered = true;
    }
  }

  public onForegroundEvent(observer: (event: Event) => void): () => void {
    if (!isFunction(observer)) {
      throw new Error("notifee.onForegroundEvent(*) 'observer' expected a function.");
    }

    const subscriber = this.emitter.addListener(
      this.native.NOTIFICATION_EVENT_KEY,
      ({ type, detail }) => {
        observer({ type, detail });
      },
    );

    return (): void => {
      subscriber.remove();
    };
  }

  public openNotificationSettings(channelId?: string): Promise<void> {
    if (!isUndefined(channelId) && !isString(channelId)) {
      throw new Error("notifee.openNotificationSettings(*) 'channelId' expected a string value.");
    }

    if (isIOS) {
      return Promise.resolve();
    }

    return this.native.openNotificationSettings(channelId || null);
  }

  public requestPermission(
    permissions: IOSNotificationPermissions,
  ): Promise<IOSNotificationSettings | null> {
    if (isAndroid) {
      return Promise.resolve(null);
    }

    let options: IOSNotificationPermissions;
    try {
      options = validateIOSPermissions(permissions);
    } catch (e) {
      throw new Error(`notifee.requestPermission(*) ${e.message}`);
    }

    return this.native.requestPermission(options);
  }

  public registerForegroundService(runner: (notification: Notification) => Promise<void>): void {
    if (!isFunction(runner)) {
      throw new Error("notifee.registerForegroundService(_) 'runner' expected a function.");
    }

    if (isIOS) {
      return;
    }

    registeredForegroundServiceTask = runner;
  }

  public setNotificationCategories(categories: IOSNotificationCategory[]): Promise<void> {
    if (isAndroid) {
      return Promise.resolve();
    }

    if (!isArray(categories)) {
      throw new Error(
        "notifee.setNotificationCategories(*) 'categories' expected an array of IOSCategory.",
      );
    }

    const options = [];
    try {
      for (let i = 0; i < categories.length; i++) {
        options[i] = validateIOSCategory(categories[i]);
      }
    } catch (e) {
      throw new Error(
        `notifee.setNotificationCategories(*) 'categories' a category is invalid: ${e.message}`,
      );
    }

    return this.native.setNotificationCategories(categories);
  }

  public getNotificationCategories(): Promise<IOSNotificationCategory[]> {
    if (isAndroid) {
      return Promise.resolve([]);
    }

    return this.native.getNotificationCategories();
  }

  public getNotificationSettings(): Promise<null | IOSNotificationSettings> {
    if (isAndroid) {
      return Promise.resolve(null);
    }

    return this.native.getNotificationSettings();
  }
  // public scheduleNotification(notification: Notification, schedule: Schedule): Promise<void> {
  //   return Promise.resolve();
  // let notificationOptions;
  // try {
  //   notificationOptions = validateNotification(notification);
  // } catch (e) {
  //   throw new Error(`notifee.scheduleNotification(*) ${e.message}`);
  // }
  //
  // let scheduleOptions;
  // // try {
  // //   scheduleOptions = validateSchedule(schedule);
  // // } catch (e) {
  // //   throw new Error(`notifee.scheduleNotification(_, *) ${e.message}`);
  // // }
  //
  // return this.native.scheduleNotification(notificationOptions, scheduleOptions);
  // }
}
