/* eslint-disable @typescript-eslint/no-duplicate-enum-values */

export enum Dimensions {
	Eight = 32, // 2rem
	Eighty = 320, // 20rem
	Eleven = 44, // 2.75rem
	FiftySix = 224, // 14rem
	FiftyTwo = 208, // 13rem
	Five = 20, // 1.25rem
	Forty = 160, // 10rem
	FortyEight = 192, // 12rem
	FortyFour = 176, // 11rem
	Four = 16, // 1rem
	Fourteen = 56, // 3.5rem
	Half = 2, // 0.125rem
	HalfPixel = 0.5,
	Nine = 36, // 2.25rem
	NinetySix = 384, // 24rem
	One = 4, // 0.25rem
	OneAndHalf = 6, // 0.375rem
	// standard values
	OnePixel = 1,
	Quarter = 1, // 0.0625rem
	Rem = 16,
	Seven = 28, // 1.75rem
	SeventyTwo = 288, // 18rem
	Six = 24, // 1.5rem
	Sixteen = 64, // 4rem
	Sixty = 240, // 15rem
	SixtyFour = 256, // 16rem
	Ten = 40, // 2.5rem
	ThirtySix = 144, // 9rem
	ThirtyTwo = 128, // 8rem
	Three = 12, // 0.75rem
	ThreeAndHalf = 14, // 0.875rem
	Twelve = 48, // 3rem
	Twenty = 80, // 5rem
	TwentyEight = 112, // 7rem
	TwentyFour = 96, // 6rem
	Two = 8, // 0.5rem
	TwoAndHalf = 10, // 0.625rem
	// tailwind values
	Zero = 0, // 0rem
}
export const ONE_MINUTE_IN_MS = 60 * 1000;
export const FIVE_SECONDS = 5 * 1000;
export const TEN_MINUTES = 10 * 60 * 1000;
export const ONE_HOUR_IN_SECONDS = 60 * 60;
export const ONE_WEEK_IN_SECONDS = 7 * 24 * 60 * 60;
export const FIREBASE_LOCAL_STORAGE_KEY = "firebase-signin-email";
export const SESSION_COOKIE = "grantflow_session";

export enum UserRole {
	Admin = "ADMIN",
	Member = "MEMBER",
	Owner = "OWNER",
}
