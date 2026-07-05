// Every reconstructed post body begins with an `# <title>` H1 that duplicates the
// frontmatter title — which each page already renders on its own. Drop that H1 only
// when it is the first element in the body; an H1 that appears after other content
// is a legitimate section heading and stays.
export function dropTitleH1() {
  return (tree) => {
    const children = tree.children ?? [];
    const first = children.find((n) => n.type === 'element');
    if (first?.tagName === 'h1') children.splice(children.indexOf(first), 1);
  };
}
