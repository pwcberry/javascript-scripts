/**
 * These scripts are to remove impediments on HTML content so that it can be read or interacted with.
 */

/**
 * Use for Sky and Telescope
 */
(() => {
    document.body.style.overflow = "inherit";
    document.querySelector(".olyticsblocker").style.display = "none";
    document.querySelector("cnx")?.remove();
})();
