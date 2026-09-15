/**
 * Strip Bootstrap from the current page: remove its stylesheets outright, and if
 * Bootstrap's JS is present, remove it too and replace the (possibly JS-mutated)
 * body with a freshly fetched, pristine copy from the server.
 *
 * Load as an ES module, e.g. <script type="module" src="strapless.js"></script>,
 * so the top-level await below is valid.
 *
 * This is an updated version of: https://gist.github.com/aarongustafson/081d6e950c1f2cc57e22
 */
document.querySelectorAll("[href*=bootstrap][href$=css]").forEach((link) => link.remove());

const scripts = document.querySelectorAll("[src*=bootstrap][src$=js]");

if (scripts.length) {
    scripts.forEach((script) => script.remove());

    const html = await fetch(window.location.href).then((response) => response.text());
    const { body } = new DOMParser().parseFromString(html, "text/html");

    document.body.replaceWith(body);
}
