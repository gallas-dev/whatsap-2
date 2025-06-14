import { setupContactEvents } from "./contact.controller.js";
import { setupNouvelleDiscussionEvents } from "./nouvelle.discussion.controller.js";
import { setupGroupeEvents } from "./groupe.controller.js";
import {
  getContacts,
  getContactById,
  blockContact,
  getBlockedContacts,
  unblockContact,
} from "../services/contact.service.js";
import { getGroupes, saveGroupes } from "../services/groupe.service.js";
import { updateContactsList } from "../utils/utils.js";
import { templates } from "../../public/views/components/template.js";

let selectedContactId = null;

async function loadTemplate(url, panelId = "panel", setupFunction = null) {
  try {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const response = await fetch(url);
    const html = await response.text();
    panel.innerHTML = html;

    if (setupFunction) {
      // Use requestAnimationFrame to ensure DOM elements are fully parsed and available
      requestAnimationFrame(() => {
        setupFunction();
      });
    }
  } catch (error) {
    console.error(`Erreur de chargement (${url}):`, error);
  }
}

async function showContactInfo(contact) {
  const modal = document.createElement("div");
  modal.classList = "mod";
  modal.innerHTML = templates.contactInfo(contact);
  document.body.appendChild(modal);

  modal.querySelector(".close-btn").addEventListener("click", () => {
    modal.remove();
  });
}

async function updateBlockedContactsCounter() {
  try {
    const blockedContacts = await getBlockedContacts();
    const nombreBloquer = document.getElementById("nombreBloquer");
    if (nombreBloquer) {
      nombreBloquer.textContent = blockedContacts.length;
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du compteur:", error);
  }
}

async function displayGroupes() {
  const groupesList = document.getElementById("groupes-list");
  if (!groupesList) return;

  try {
    const groupes = await getGroupes();
    const activeGroupes = groupes.filter((g) => !g.closed);
    groupesList.innerHTML = templates.groupesList(activeGroupes);
  } catch (error) {
    console.error("Erreur lors du chargement des groupes:", error);
    groupesList.innerHTML = "<p>Erreur lors du chargement des groupes.</p>";
  }
}

async function toggleGroupesView() {
  const groupesContainer = document.getElementById("groupes-container");
  const conversationsList = document.querySelector("#panel .overflow-y-auto:last-child");
  const groupesBtn = document.getElementById("groupesBtn");
  const allTabs = document.querySelectorAll("#panel .flex.border-b.border-gray-700 button");

  if (!groupesContainer || !conversationsList) {
    console.error("Éléments manquants:", { groupesContainer, conversationsList });
    return;
  }

  // Réinitialiser tous les onglets
  allTabs.forEach(tab => {
    tab.classList.remove("text-green-500", "border-b-2", "border-green-500", "font-medium");
    tab.classList.add("text-gray-400", "hover:text-white");
  });

  if (groupesContainer.classList.contains("hidden")) {
    // Afficher les groupes
    groupesContainer.classList.remove("hidden");
    conversationsList.classList.add("hidden");
    
    // Activer l'onglet Groupes
    if (groupesBtn) {
      groupesBtn.classList.remove("text-gray-400", "hover:text-white");
      groupesBtn.classList.add("text-green-500", "border-b-2", "border-green-500", "font-medium");
    }
    
    await displayGroupes();
  } else {
    // Masquer les groupes et afficher les conversations
    groupesContainer.classList.add("hidden");
    conversationsList.classList.remove("hidden");
    
    // Activer l'onglet "Toutes"
    const toutesBtn = allTabs[0];
    if (toutesBtn) {
      toutesBtn.classList.remove("text-gray-400", "hover:text-white");
      toutesBtn.classList.add("text-green-500", "border-b-2", "border-green-500", "font-medium");
    }
  }
}

export async function setupPanelEvents() {
  document.addEventListener("click", async (event) => {
    const pup = document.getElementById("pup");

    const buttonHandlers = {
      "#plus": "/views/pages/nouvelle.discussion.html",
      "#retourbtn": "/views/pages/nouvelle.discussion.html",
      "#newContact": "/views/pages/newContact.view.html",
      "#backnewgroupe": "/views/pages/nouvelle.discussion.html",
      "#paramsBtn": "/views/components/params.html",
      "#confback": "/views/components/params.html",
      "#blockback": "/views/components/bloquerListe.html",
      "#contactBlocked": "/views/components/bloquerListe.html",
      "#newgroup": "/views/pages/nouveau.groupe.html",
      "#listedescontactbloquer": "/views/components/listecontactbloquer.html",
    };

    for (const [selector, url] of Object.entries(buttonHandlers)) {
      if (event.target.closest(selector)) {
        let setupFn;
        if (selector === "#plus" || selector === "#retourbtn") {
          setupFn = setupNouvelleDiscussionEvents;
        } else if (selector === "#newgroup") {
          setupFn = setupGroupeEvents;
        } else if (selector === "#listedescontactbloquer") {
          setupFn = displayBlockedContacts;
        } else if (selector === "#contactBlocked") {
          setupFn = async () => {
            await displayBlockedContacts();
            await updateBlockedContactsCounter();
          };
        } else {
          setupFn = setupContactEvents;
        }

        await loadTemplate(url, "panel", setupFn);
        return;
      }
    }

    // Gestion du clic sur l'onglet Groupes
    if (event.target.closest("#groupesBtn")) {
      await toggleGroupesView();
      return;
    }

    const menupopup = event.target.closest("#menupopup");
    if (menupopup) {
      try {
        const response = await fetch("/views/components/popup.html");
        const html = await response.text();
        pup.innerHTML = html;
        pup.style.display = "block";

        pup.querySelector(".info-btn")?.addEventListener("click", async () => {
          if (!selectedContactId) {
            alert("Veuillez sélectionner un contact");
            return;
          }
          try {
            const contact = await getContactById(selectedContactId);
            showContactInfo(contact);
            pup.style.display = "none";
          } catch (error) {
            alert("Erreur lors de la récupération des informations");
            console.error(error);
          }
        });

        pup.querySelector(".block-btn")?.addEventListener("click", async () => {
          if (!selectedContactId) {
            alert("Veuillez sélectionner un contact");
            return;
          }
          try {
            await blockContact(selectedContactId);
            const contactElement = document.querySelector(
              `[data-contact-id="${selectedContactId}"]`
            );
            if (contactElement) contactElement.remove();
            
            // Mettre à jour le compteur de contacts bloqués
            await updateBlockedContactsCounter();
            
            alert("Contact bloqué avec succès");
            pup.style.display = "none";
          } catch (error) {
            alert("Erreur lors du blocage du contact");
            console.error(error);
          }
        });
      } catch (error) {
        console.error("Erreur lors du chargement du popup:", error);
      }
    } else if (!event.target.closest("#pup")) {
      pup.style.display = "none";
    }

    const debloque = event.target.closest("#debloque");
    if (debloque) {
      const confirmed = confirm("Voulez-vous débloquer ce contact ?");
      if (confirmed) {
      }
    }

    const reurnInfo = event.target.closest("#reurnInfo .close-btn");
    if (reurnInfo) {
      reurnInfo.closest("#reurnInfo").remove();
    }
  });
}

export function setupAccueilEvents() {
  document.addEventListener("click", (event) => {
    if (event.target.closest("#logoutBtn")) {
      localStorage.removeItem("user");
      location.reload();
    }
  });
}

export function setupSidebarEvents() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      localStorage.removeItem("contacts");
      window.location.href = "/views/pages/login.views.html";
    });
  }
}

export function setupContactSelection() {
  document.addEventListener("click", async (event) => {
    const contactItem = event.target.closest(".contact-item");
    if (contactItem) {
      document
        .querySelectorAll(".contact-item")
        .forEach((item) => item.classList.remove("selected"));
      contactItem.classList.add("selected");
      selectedContactId = contactItem.dataset.contactId;

      try {
        const contact = await getContactById(selectedContactId);
        document.getElementById(
          "contactName"
        ).textContent = `${contact.prenom} ${contact.nom}`;
      } catch (error) {
        console.error("Erreur:", error);
      }
    }
  });
}

async function displayBlockedContacts() {
  const blockedContactsList = document.getElementById("blocked-contacts-list");
  if (!blockedContactsList) return;

  try {
    const blockedContacts = await getBlockedContacts();
    blockedContactsList.innerHTML =
      templates.blockedContactsList(blockedContacts);

    // Mettre à jour le compteur de contacts bloqués
    await updateBlockedContactsCounter();

    blockedContactsList.addEventListener("click", async (e) => {
      const unblockBtn = e.target.closest(".unblock-btn");
      if (!unblockBtn) return;

      const contactItem = unblockBtn.closest(".blocked-contact-item");
      const contactId = contactItem?.dataset.contactId;
      if (!contactId) return;

      try {
        await unblockContact(contactId);
        contactItem.remove();

        const currentUser = JSON.parse(localStorage.getItem("user"));
        if (currentUser?.id) {
          const contacts = await getContacts(currentUser.id);
          updateContactsList(contacts);
        }

        if (blockedContactsList.children.length === 0) {
          blockedContactsList.innerHTML = templates.blockedContactsList([]);
        }

        // Mettre à jour le compteur après déblocage
        await updateBlockedContactsCounter();
      } catch (error) {
        console.error("Erreur lors du déblocage:", error);
        alert("Erreur lors du déblocage du contact");
      }
    });
  } catch (error) {
    console.error("Erreur lors du chargement des contacts bloqués:", error);
    blockedContactsList.innerHTML = templates.blockedContactsError;
  }
}

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

window.removeMemberFromGroup = async (groupId) => {
  const memberId = prompt("Entrez l'ID du membre à retirer :");
  if (!memberId) return;

  try {
    const groupes = await getGroupes();
    const groupe = groupes.find((g) => g.id === groupId);
    if (!groupe) {
      alert("Groupe introuvable !");
      return;
    }

    if (!groupe.membres.includes(memberId)) {
      alert("Le membre n'est pas dans le groupe !");
      return;
    }

    groupe.membres = groupe.membres.filter((m) => m !== memberId);
    await saveGroupes(groupes);
    displayGroupes();
    alert("Membre retiré avec succès !");
  } catch (error) {
    console.error("Erreur lors du retrait du membre :", error);
    alert("Erreur lors du retrait du membre !");
  }
};

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

window.showContactsToAdd = async (groupId) => {
  const contactsListContainer = document.getElementById(
    `contacts-list-${groupId}`
  );
  if (!contactsListContainer) return;

  try {
    const contacts = await getContacts();
    const groupes = await getGroupes();
    const groupe = groupes.find((g) => g.id === groupId);

    if (!groupe) {
      alert("Groupe introuvable !");
      return;
    }

    const availableContacts = contacts.filter(
      (contact) => !groupe.membres.includes(contact.id)
    );

    if (availableContacts.length === 0) {
      contactsListContainer.innerHTML = `<p class="text-gray-500">Aucun contact disponible</p>`;
      return;
    }

    // Génère la liste des contacts
    contactsListContainer.innerHTML = availableContacts
      .map(
        (contact) => `
      <div class="flex items-center justify-between p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
            ${contact.prenom[0]}${contact.nom[0]}
          </div>
          <div>
            <h3 class="text-gray-900 dark:text-white font-medium">${contact.prenom} ${contact.nom}</h3>
            <p class="text-sm text-gray-500">${contact.telephone}</p>
          </div>
        </div>
        <button 
          class="text-sm text-green-500 hover:text-green-400"
          onclick="addMemberToGroup('${groupId}', '${contact.id}')"
        >
          Ajouter
        </button>
      </div>
    `
      )
      .join("");

    contactsListContainer.classList.remove("hidden");
  } catch (error) {
    console.error("Erreur lors du chargement des contacts :", error);
    contactsListContainer.innerHTML = `<p class="text-red-500">Erreur lors du chargement des contacts</p>`;
  }
};

window.showMembersToRemove = async (groupId) => {
  const contactsListContainer = document.getElementById(
    `contacts-list-${groupId}`
  );
  if (!contactsListContainer) return;

  try {
    const groupes = await getGroupes();
    const groupe = groupes.find((g) => g.id === groupId);

    if (!groupe) {
      alert("Groupe introuvable !");
      return;
    }

    if (groupe.membres.length === 0) {
      contactsListContainer.innerHTML = `<p class="text-gray-500">Aucun membre à retirer</p>`;
      return;
    }

    contactsListContainer.innerHTML = await Promise.all(
      groupe.membres.map(async (memberId) => {
        const contact = await getContactById(memberId);
        return `
        <div class="flex items-center justify-between p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white">
              ${contact.prenom[0]}${contact.nom[0]}
            </div>
            <div>
              <h3 class="text-gray-900 dark:text-white font-medium">${contact.prenom} ${contact.nom}</h3>
              <p class="text-sm text-gray-500">${contact.telephone}</p>
            </div>
          </div>
          <button 
            class="text-sm text-red-500 hover:text-red-400"
            onclick="removeMemberFromGroup('${groupId}', '${contact.id}')"
          >
            Retirer
          </button>
        </div>
      `;
      })
    ).join("");

    contactsListContainer.classList.remove("hidden");
  } catch (error) {
    console.error("Erreur lors du chargement des membres :", error);
    contactsListContainer.innerHTML = `<p class="text-red-500">Erreur lors du chargement des membres</p>`;
  }
};