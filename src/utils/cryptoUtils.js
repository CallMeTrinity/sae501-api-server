import CryptoJS from "crypto-js";

const secretKey = "JsuGsqplmeqalbdssdlga12gqo2b"; // La clé secrète utilisée pour l'encryptage

export function encryptParam(param) {
    if (!param || param === "") {
        return null;
    }
    const encrypted = CryptoJS.AES.encrypt(param.toString(), secretKey).toString();
    return encodeURIComponent(encrypted); // Encodez pour une utilisation sécurisée dans l'URL
}
export function decryptParam(encryptedParam) {
    try {
        const bytes = CryptoJS.AES.decrypt(decodeURIComponent(encryptedParam), secretKey);
        return bytes.toString(CryptoJS.enc.Utf8); // Retourne la donnée décryptée sous forme de chaîne
    } catch (error) {
        console.error("Erreur lors du décryptage :", error);
        return null; // En cas d'erreur, retournez `null` pour éviter des comportements inattendus
    }
}
