const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const admin = require("firebase-admin");
const {getFirestore} = require("firebase-admin/firestore");
const {v4: uuidv4} = require("uuid");

initializeApp();
const db = getFirestore();

/**
 * Gera um token seguro e único.
 * @return {string} O token gerado.
 */
function generateSecureToken() {
  // Usa uuidv4 para gerar um token forte e aleatório.
  return uuidv4();
}


exports.createMemberAndToken = onCall(async (request) => {
  // 1. Verificação de Autenticação
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "Você deve estar autenticado para adicionar um colaborador.",
    );
  }

  const {name, email} = request.data;
  const companyId = request.auth.uid; // ID do gestor autenticado

  // 2. Validação dos dados de entrada
  if (!name || !email) {
    throw new HttpsError(
        "invalid-argument",
        "O nome e o e-mail do colaborador são obrigatórios.",
    );
  }

  try {
    // 3. Geração do Token Seguro no Servidor
    const loginToken = generateSecureToken();

    // 4. Criação do documento no Firestore
    await db.collection("members").add({
      name,
      email,
      companyId,
      loginToken,
      createdAt: new Date(),
    });

    // 5. Retorno do token para o cliente
    return {token: loginToken};
  } catch (error) {
    console.error("Erro ao criar colaborador:", error);
    throw new HttpsError(
        "internal",
        "Ocorreu um erro inesperado ao criar o colaborador.",
    );
  }
});

/**
 * Cloud Function para trocar um token de acesso de um membro
 * por um token de autenticação customizado do Firebase.
 */
exports.exchangeTokenForAuth = onCall(async (data, context) => {
  const accessToken = data.token;

  if (!accessToken || typeof accessToken !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "O token fornecido é inválido."
    );
  }

  // Procura o membro que possui este token de acesso
  const membersRef = db.collection("members");
  const snapshot = await membersRef.where("accessToken", "==", accessToken).limit(1).get();

  if (snapshot.empty) {
    throw new HttpsError(
      "not-found",
      "Token de acesso inválido ou expirado."
    );
  }

  const memberDoc = snapshot.docs[0];
  const memberId = memberDoc.id; // O ID do documento do membro será o UID dele

  try {
    // Gera o token de autenticação customizado para o UID do membro
    const firebaseAuthToken = await admin.auth().createCustomToken(memberId);
    return { token: firebaseAuthToken };
  } catch (error) {
    console.error("Erro ao criar custom token:", error);
    throw new HttpsError(
      "internal",
      "Não foi possível gerar o token de autenticação."
    );
  }
});

/**
 * Cloud Function para regenerar o token de um colaborador existente.
 */
exports.regenerateMemberToken = onCall(async (request) => {
  // 1. Verificação de Autenticação
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "Você deve estar autenticado para realizar esta ação.",
    );
  }

  const {memberId} = request.data;
  const companyId = request.auth.uid;

  if (!memberId) {
    throw new HttpsError("invalid-argument", "O ID do colaborador é obrigatório.");
  }

  try {
    const memberRef = db.collection("members").doc(memberId);
    const memberDoc = await memberRef.get();

    // Garante que o gestor só pode modificar seus próprios colaboradores
    if (!memberDoc.exists() || memberDoc.data().companyId !== companyId) {
      throw new HttpsError("not-found", "Colaborador não encontrado ou não pertence à sua empresa.");
    }

    const newLoginToken = generateSecureToken();
    await memberRef.update({accessToken: newLoginToken});

    return {success: true, message: "Token regenerado com sucesso."};
  } catch (error) {
    console.error("Erro ao regenerar token:", error);
    throw new HttpsError("internal", "Ocorreu um erro ao regenerar o token.");
  }
});
