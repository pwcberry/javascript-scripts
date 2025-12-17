// Ensure you are on the pinboard.io add page
function addBookmark({ url, title, description, tags }) {
    const frm = document.forms[0];
    frm.elements["url"].value = url instanceof URL ? url.toString() : url;
    frm.elements["title"].value = title;
    frm.elements["description"].value = description;
    frm.elements["tags"].value = Array.isArray(tags) ? tags.join(" ") : tags;
    frm.submit();
}

// Save to localStorage as "pins"
const newPins = [];
