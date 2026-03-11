/**
 * RevenueCat Service — Apple In-App Purchase abstraction
 * Handles initialization, purchases, restores, and plan derivation.
 */
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import type { SubscriptionPlan } from '../stores/authStore';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY!;

/** Call once at app startup, after auth is resolved */
export async function initRevenueCat(supabaseUserId?: string): Promise<void> {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({
    apiKey: REVENUECAT_API_KEY,
    appUserID: supabaseUserId ?? undefined,
  });
}

/** Log in to RevenueCat with Supabase user ID (call on sign-in) */
export async function loginRevenueCat(supabaseUserId: string): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.logIn(supabaseUserId);
  return customerInfo;
}

/** Log out from RevenueCat (call on sign-out) */
export async function logoutRevenueCat(): Promise<void> {
  await Purchases.logOut();
}

/** Get current offerings (for paywall display) */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

/** Purchase a specific package */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/** Restore purchases (Apple requires this to be visible) */
export async function restorePurchases(): Promise<CustomerInfo> {
  return await Purchases.restorePurchases();
}

/** Get current CustomerInfo */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  return await Purchases.getCustomerInfo();
}

/** Derive SubscriptionPlan from RevenueCat entitlements */
export function planFromCustomerInfo(info: CustomerInfo): SubscriptionPlan {
  if (info.entitlements.active['team']?.isActive) return 'team';
  if (info.entitlements.active['pro']?.isActive) return 'pro';
  return 'free';
}

/** Listen for subscription changes (renewal, expiration, upgrade) */
export function addCustomerInfoListener(
  callback: (info: CustomerInfo) => void
): void {
  Purchases.addCustomerInfoUpdateListener(callback);
}
