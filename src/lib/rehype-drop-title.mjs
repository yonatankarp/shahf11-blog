// Every reconstructed post body begins with an `# <title>` H1 that duplicates the
// frontmatter title — which each page already renders on its own. Drop that leading
// H1 so the title isn't shown twice. Only the first top-level H1 is removed; any later
// H1 in the body is left intact.
export function dropTitleH1() {
  return (tree) => {
    const children = tree.children ?? [];
    const i = children.findIndex((n) => n.type === 'element' && n.tagName === 'h1');
    if (i !== -1) children.splice(i, 1);
  };
}
