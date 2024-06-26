import dayjs from "dayjs";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { PaymentRecord, PUser } from "../../../../types/user.types";

export const updateUserStats = async ({
  userId,
  totalGuesses,
}: {
  userId: string;
  totalGuesses: number;
}): Promise<void> => {
  const db = getFirestore();
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new Error("User not found");
  }
  const user = userDoc.data() as PUser;
  if (!user) {
    throw new Error("User data is empty");
  }

  const previousDate = user.stats?.lastGameDate;
  const dayStreak =
    dayjs().diff(dayjs(previousDate), "day") === 1
      ? (user.stats?.dayStreak ?? 0) + 1
      : 1;

  await userRef.update({
    stats: {
      totalGuesses: (user.stats?.totalGuesses ?? 0) + totalGuesses,
      totalGames: (user.stats?.totalGames ?? 0) + 1,
      dayStreak,
      lastGameDate: dayjs().format("YYYY-MM-DD"),
    },
  });
};

export const addRecordToUserPaymentHistory = async ({
  userId,
  record,
}: {
  userId: string;
  record: PaymentRecord;
}) => {
  const db = getFirestore();
  const userRef = db.collection("users").doc(userId);

  return userRef.update({
    paymentHistory: FieldValue.arrayUnion(record),
  });
};

export const decrementUserBestGuesses = async ({
  userId,
}: {
  userId: string;
}) => {
  if (!userId) throw new Error("User not found");

  const db = getFirestore();
  const userRef = db.collection("users").doc(userId);

  return userRef.update({
    numberOfBestGuesses: FieldValue.increment(-1),
  });
};

export const incrementUserBestGuess = async ({
  userId,
  quantity,
}: {
  userId: string;
  quantity: number;
}) => {
  if (!userId) throw new Error("User not found");

  const db = getFirestore();
  const userRef = db.collection("users").doc(userId);

  return userRef.update({
    numberOfBestGuesses: FieldValue.increment(quantity),
  });
};
