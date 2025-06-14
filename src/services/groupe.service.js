const BASE_URL = "https://backend-js-server-vrai.onrender.com/groupes";
// const BASE_URL = "http://localhost:3000/groupes";

async function fetchData(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Erreur HTTP: ${response.status}`);
  }
  return await response.json();
}

export async function createGroupe(groupeData) {
  try {
    if (
      !groupeData.nom ||
      !groupeData.adminId ||
      !groupeData.membres ||
      groupeData.membres.length < 2
    ) {
      throw new Error("Données de groupe invalides");
    }

    const groupe = {
      ...groupeData,
      createdAt: new Date().toISOString(),
    };

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupe),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur création groupe:", error);
    throw error;
  }
}

export async function getGroupesByUserId(userId) {
  try {
    return await fetchData(`${BASE_URL}?adminId=${userId}`);
  } catch (error) {
    console.error("Erreur récupération groupes:", error);
    throw error;
  }
}

export async function getGroupes() {
  const response = await fetch("/src/db.json");
  const data = await response.json();
  return data.groupes || [];
}

export async function saveGroupes(groupes) {
  try {
    const response = await fetch("/src/db.json", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupes }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des groupes :", error);
    throw error;
  }
}

window.closeGroup = async (groupId) => {
  if (!confirm("Êtes-vous sûr de vouloir fermer ce groupe ?")) return;

  try {
    const groupes = await getGroupes();
    const groupe = groupes.find((g) => g.id === groupId);

    if (!groupe) {
      alert("Groupe introuvable !");
      return;
    }

    groupe.closed = true;

    await saveGroupes(groupes);

    displayGroupes();
    alert("Groupe fermé avec succès !");
  } catch (error) {
    console.error("Erreur lors de la fermeture du groupe :", error);
    alert("Erreur lors de la fermeture du groupe !");
  }
};

window.addMemberToGroup = async (groupId, memberId) => {
  try {
    const groupes = await getGroupes();
    const groupe = groupes.find((g) => g.id === groupId);

    if (!groupe) {
      alert("Groupe introuvable !");
      return;
    }

    if (groupe.membres.includes(memberId)) {
      alert("Le membre est déjà dans le groupe !");
      return;
    }

    groupe.membres.push(memberId);
    await saveGroupes(groupes);
    displayGroupes();
    alert("Membre ajouté avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'ajout du membre :", error);
    alert("Erreur lors de l'ajout du membre !");
  }
};
