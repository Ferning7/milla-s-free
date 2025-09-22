const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.exchangeToken = functions.https.onCall(async (data, context) => {
  const loginToken = data.token;

  if (!loginToken) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O token não foi fornecido."
    );
  }

  const db = admin.firestore();
  const membersRef = db.collection("members");
  const snapshot = await membersRef.where("loginToken", "==", loginToken).limit(1).get();

  if (snapshot.empty) {
    throw new functions.https.HttpsError(
      "not-found",
      "Token de login inválido ou expirado."
    );
  }

  const memberDoc = snapshot.docs[0];
  const memberId = memberDoc.id;

  try {
    const customToken = await admin.auth().createCustomToken(memberId);
    return { token: customToken };
  } catch (error) {
    console.error("Erro ao criar custom token:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao gerar o token de autenticação."
    );
  }
});
