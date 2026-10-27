"use strict";

// =====================================
// NoteNest — Notes Application
// =====================================

const STORAGE_KEY = "notenest_notes_v1";

const allNotesButton = document.querySelector("#allNotesButton");
const pinnedNotesButton = document.querySelector("#pinnedNotesButton");

const sidebarNoteCount = document.querySelector("#sidebarNoteCount");
const pageTitle = document.querySelector("#pageTitle");

const newNoteButton = document.querySelector("#newNoteButton");
const emptyCreateButton = document.querySelector("#emptyCreateButton");

const searchInput = document.querySelector("#searchInput");
const notesSummary = document.querySelector("#notesSummary");

const pinnedSection = document.querySelector("#pinnedSection");
const pinnedNotesGrid = document.querySelector("#pinnedNotesGrid");
const pinnedCount = document.querySelector("#pinnedCount");

const notesSectionTitle = document.querySelector("#notesSectionTitle");
const notesGrid = document.querySelector("#notesGrid");
const visibleNotesCount = document.querySelector("#visibleNotesCount");

const emptyState = document.querySelector("#emptyState");
const emptyTitle = document.querySelector("#emptyTitle");
const emptyDescription = document.querySelector("#emptyDescription");

const noteDialog = document.querySelector("#noteDialog");
const noteForm = document.querySelector("#noteForm");
const dialogTitle = document.querySelector("#dialogTitle");

const noteTitleInput = document.querySelector("#noteTitle");
const noteContentInput = document.querySelector("#noteContent");
const characterCount = document.querySelector("#characterCount");

const closeDialogButton = document.querySelector("#closeDialogButton");
const cancelButton = document.querySelector("#cancelButton");

const deleteDialog = document.querySelector("#deleteDialog");
const cancelDeleteButton = document.querySelector("#cancelDeleteButton");
const confirmDeleteButton = document.querySelector("#confirmDeleteButton");

const currentYear = document.querySelector("#currentYear");
const toast = document.querySelector("#toast");

let notes = loadNotes();
let currentFilter = "all";
let editingNoteId = null;
let deletingNoteId = null;
let toastTimeout = null;


// =====================================
// Storage
// =====================================

function loadNotes() {
    try {
        const storedNotes = localStorage.getItem(STORAGE_KEY);

        if (!storedNotes) {
            return [];
        }

        const parsedNotes = JSON.parse(storedNotes);

        if (!Array.isArray(parsedNotes)) {
            return [];
        }

        return parsedNotes.filter((note) => {
            return (
                note &&
                typeof note.id === "string" &&
                typeof note.title === "string" &&
                typeof note.content === "string"
            );
        });
    } catch (error) {
        console.error("Could not load notes:", error);
        return [];
    }
}

function saveNotes() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        return true;
    } catch (error) {
        console.error("Could not save notes:", error);

        showToast(
            "Could not save notes. Check your browser storage."
        );

        return false;
    }
}


// =====================================
// Utilities
// =====================================

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

function getFilteredNotes() {
    const query = searchInput.value.trim().toLowerCase();

    return notes
        .filter((note) => {
            if (currentFilter === "pinned" && !note.pinned) {
                return false;
            }

            return (
                note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query)
            );
        })
        .sort((first, second) => {
            if (first.pinned !== second.pinned) {
                return Number(second.pinned) - Number(first.pinned);
            }

            return (
                new Date(second.updatedAt).getTime() -
                new Date(first.updatedAt).getTime()
            );
        });
}


// =====================================
// Render Notes
// =====================================

function createNoteCard(note) {
    const card = document.createElement("article");

    card.className = "note-card";

    if (note.pinned) {
        card.classList.add("pinned");
    }

    const header = document.createElement("div");
    header.className = "note-card-header";

    const title = document.createElement("h3");
    title.textContent = note.title;

    header.append(title);

    if (note.pinned) {
        const pin = document.createElement("span");

        pin.className = "pin-indicator";
        pin.textContent = "📌";
        pin.title = "Pinned note";

        header.append(pin);
    }

    const preview = document.createElement("p");

    preview.className = "note-preview";
    preview.textContent = note.content;

    const footer = document.createElement("div");
    footer.className = "note-card-footer";

    const date = document.createElement("span");

    date.className = "note-date";
    date.textContent = `Updated ${formatDate(note.updatedAt)}`;

    const actions = document.createElement("div");
    actions.className = "note-actions";

    const pinButton = document.createElement("button");

    pinButton.type = "button";
    pinButton.className = "note-action";
    pinButton.textContent = note.pinned ? "📌" : "♧";

    pinButton.title = note.pinned ? "Unpin note" : "Pin note";
    pinButton.setAttribute(
        "aria-label",
        note.pinned ? "Unpin note" : "Pin note"
    );

    pinButton.addEventListener("click", () => {
        togglePin(note.id);
    });

    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "note-action";
    editButton.textContent = "✎";
    editButton.title = "Edit note";
    editButton.setAttribute("aria-label", "Edit note");

    editButton.addEventListener("click", () => {
        openEditor(note.id);
    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "note-action delete-action";
    deleteButton.textContent = "⌫";
    deleteButton.title = "Delete note";
    deleteButton.setAttribute("aria-label", "Delete note");

    deleteButton.addEventListener("click", () => {
        openDeleteDialog(note.id);
    });

    actions.append(pinButton, editButton, deleteButton);
    footer.append(date, actions);

    card.append(header, preview, footer);

    return card;
}

function renderGrid(container, noteList) {
    container.replaceChildren();

    const fragment = document.createDocumentFragment();

    noteList.forEach((note) => {
        fragment.append(createNoteCard(note));
    });

    container.append(fragment);
}

function renderNotes() {
    const filteredNotes = getFilteredNotes();
    const query = searchInput.value.trim();

    sidebarNoteCount.textContent = String(notes.length);

    const totalPinned = notes.filter((note) => note.pinned).length;

    pinnedCount.textContent = String(totalPinned);

    pinnedSection.hidden = currentFilter === "pinned";

    if (currentFilter === "pinned") {
        pageTitle.textContent = "Pinned Notes";
        notesSectionTitle.textContent = "Your Pinned Notes";
        renderGrid(notesGrid, filteredNotes);

        visibleNotesCount.textContent = String(filteredNotes.length);

        notesSummary.textContent =
            `${filteredNotes.length} pinned note${filteredNotes.length === 1 ? "" : "s"}`;

        emptyState.hidden = filteredNotes.length > 0;

        if (filteredNotes.length === 0) {
            emptyTitle.textContent = query
                ? "No matching pinned notes"
                : "Nothing pinned yet";

            emptyDescription.textContent = query
                ? "Try a different search term."
                : "Pin important notes to find them here quickly.";
        }

        return;
    }

    pageTitle.textContent = "All Notes";
    notesSectionTitle.textContent = query ? "Search Results" : "Your Notes";

    const pinnedNotes = filteredNotes.filter((note) => note.pinned);
    const regularNotes = filteredNotes.filter((note) => !note.pinned);

    renderGrid(pinnedNotesGrid, pinnedNotes);
    renderGrid(notesGrid, regularNotes);

    pinnedSection.hidden = pinnedNotes.length === 0;

    visibleNotesCount.textContent = String(regularNotes.length);

    notesSummary.textContent =
        `${notes.length} total note${notes.length === 1 ? "" : "s"} · ` +
        `${filteredNotes.length} shown`;

    const hasNotes = filteredNotes.length > 0;

    emptyState.hidden = hasNotes;

    if (!hasNotes) {
        if (query) {
            emptyTitle.textContent = "No notes found";
            emptyDescription.textContent =
                "Try another search term or create a new note.";
        } else {
            emptyTitle.textContent = "Your space is waiting";
            emptyDescription.textContent =
                "Create your first note and keep your thoughts organized in one place.";
        }
    }
}


// =====================================
// Create and Edit Notes
// =====================================

function openEditor(noteId = null) {
    editingNoteId = noteId;

    noteForm.reset();

    if (noteId) {
        const note = notes.find((item) => item.id === noteId);

        if (!note) {
            showToast("This note could not be found.");
            return;
        }

        dialogTitle.textContent = "Edit Note";

        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
    } else {
        dialogTitle.textContent = "Create a Note";
    }

    updateCharacterCount();

    if (!noteDialog.open) {
        noteDialog.showModal();
    }

    setTimeout(() => {
        noteTitleInput.focus();
    }, 0);
}

function closeEditor() {
    if (noteDialog.open) {
        noteDialog.close();
    }

    editingNoteId = null;
    noteForm.reset();

    updateCharacterCount();
}

function handleNoteSubmit(event) {
    event.preventDefault();

    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();

    if (!title || !content) {
        showToast("Please enter both a title and note content.");
        return;
    }

    const now = new Date().toISOString();

    if (editingNoteId) {
        const index = notes.findIndex(
            (note) => note.id === editingNoteId
        );

        if (index === -1) {
            showToast("This note could not be found.");
            return;
        }

        const updatedNote = {
            ...notes[index],
            title,
            content,
            updatedAt: now
        };

        const previousNote = notes[index];
        notes[index] = updatedNote;

        if (!saveNotes()) {
            notes[index] = previousNote;
            return;
        }

        closeEditor();
        renderNotes();

        showToast("Note updated successfully.");
        return;
    }

    const newNote = {
        id: createId(),
        title,
        content,
        pinned: false,
        createdAt: now,
        updatedAt: now
    };

    notes.unshift(newNote);

    if (!saveNotes()) {
        notes = notes.filter((note) => note.id !== newNote.id);
        return;
    }

    currentFilter = "all";

    updateNavigation();
    closeEditor();
    renderNotes();

    showToast("Note created successfully.");
}


// =====================================
// Pin and Unpin Notes
// =====================================

function togglePin(noteId) {
    const note = notes.find((item) => item.id === noteId);

    if (!note) {
        return;
    }

    const oldValue = note.pinned;

    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();

    if (!saveNotes()) {
        note.pinned = oldValue;
        return;
    }

    renderNotes();

    showToast(note.pinned ? "Note pinned." : "Note unpinned.");
}


// =====================================
// Delete Notes
// =====================================

function openDeleteDialog(noteId) {
    deletingNoteId = noteId;

    if (!deleteDialog.open) {
        deleteDialog.showModal();
    }
}

function closeDeleteDialog() {
    if (deleteDialog.open) {
        deleteDialog.close();
    }

    deletingNoteId = null;
}

function deleteNote() {
    if (!deletingNoteId) {
        return;
    }

    const noteId = deletingNoteId;
    const previousNotes = [...notes];

    notes = notes.filter((note) => note.id !== noteId);

    if (!saveNotes()) {
        notes = previousNotes;
        return;
    }

    closeDeleteDialog();
    renderNotes();

    showToast("Note deleted.");
}


// =====================================
// Navigation and Filters
// =====================================

function updateNavigation() {
    allNotesButton.classList.toggle(
        "active",
        currentFilter === "all"
    );

    pinnedNotesButton.classList.toggle(
        "active",
        currentFilter === "pinned"
    );
}

function showAllNotes() {
    currentFilter = "all";

    updateNavigation();
    renderNotes();
}

function showPinnedNotes() {
    currentFilter = "pinned";

    updateNavigation();
    renderNotes();
}


// =====================================
// Character Counter
// =====================================

function updateCharacterCount() {
    characterCount.textContent =
        `${noteContentInput.value.length} / 10000`;
}


// =====================================
// Keyboard Shortcuts
// =====================================

document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

    if (modifierPressed && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
    }

    if (
        modifierPressed &&
        event.key.toLowerCase() === "n" &&
        !noteDialog.open &&
        !deleteDialog.open
    ) {
        event.preventDefault();
        openEditor();
    }
});


// =====================================
// Event Listeners
// =====================================

newNoteButton.addEventListener("click", () => {
    openEditor();
});

emptyCreateButton.addEventListener("click", () => {
    openEditor();
});

allNotesButton.addEventListener("click", showAllNotes);
pinnedNotesButton.addEventListener("click", showPinnedNotes);

searchInput.addEventListener("input", renderNotes);

noteForm.addEventListener("submit", handleNoteSubmit);

closeDialogButton.addEventListener("click", closeEditor);
cancelButton.addEventListener("click", closeEditor);

cancelDeleteButton.addEventListener("click", closeDeleteDialog);
confirmDeleteButton.addEventListener("click", deleteNote);

noteContentInput.addEventListener("input", updateCharacterCount);

// Close dialogs when clicking their backdrops.
noteDialog.addEventListener("click", (event) => {
    if (event.target === noteDialog) {
        closeEditor();
    }
});

deleteDialog.addEventListener("click", (event) => {
    if (event.target === deleteDialog) {
        closeDeleteDialog();
    }
});


// =====================================
// Initialize Application
// =====================================

currentYear.textContent = new Date().getFullYear();

updateNavigation();
updateCharacterCount();
renderNotes();