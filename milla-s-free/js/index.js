const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
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


exports.createMemberToken = onCall(async (request) => {
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
    await memberRef.update({loginToken: newLoginToken});

    return {success: true, message: "Token regenerado com sucesso."};
  } catch (error) {
    console.error("Erro ao regenerar token:", error);
    throw new HttpsError("internal", "Ocorreu um erro ao regenerar o token.");
  }
});
