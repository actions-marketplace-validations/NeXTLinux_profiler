# 📚 Documentation

<% if (/[.]0-beta$/.test(packaged.version)) { %>

> <sup>_⚠️ This is the documentation of **v<%= packaged.version.replace(/[.]0-beta$/, "") %>-beta** (`@master`/`@main` branches) which includes [unreleased features](https://github.com/nextlinux/profiler/compare/latest...master) planned for next release. See documentation for current released version [**v<%= (Number(packaged.version.replace(/[.]0-beta$/, ""))-0.01).toFixed(2).replace(/[.]0/, ".") %>** (`@latest` branch) here](https://github.com/nextlinux/profiler/blob/latest/README.md)._ </sup>
> <% } %>

<% for (const partial of ["documentation/setup", "templated/templates", "templated/plugins", "documentation/contributing"]) { %>
<%- await include(`/partials/${partial}.md`) -%>
<% } %>
