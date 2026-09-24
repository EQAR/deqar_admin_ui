import { Breadcrumb } from "antd";
import Link from "next/link";
import { useRouter } from "next/router";
import menuConfig from "@/config/menu-config";

const matchesPath = (pathname, link) =>
    Boolean(link) && (pathname === link || pathname.startsWith(`${link}/`));

const findMenuTrail = (items, pathname) => {
    for (const item of items) {
        const childTrail = item.children ? findMenuTrail(item.children, pathname) : [];
        if (childTrail.length) return [item, ...childTrail];
        if (!item.external && matchesPath(pathname, item.link)) return [item];
    }
    return [];
};

const humanize = (segment) =>
    segment
        .replace(/^\[|\]$/g, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

const singularize = (value) => {
    if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
    if (value.endsWith("s")) return value.slice(0, -1);
    return value;
};

const getNestedLabel = (pathname, query, trail) => {
    if (pathname.endsWith("/create")) return "Create";

    const actionMatch = pathname.match(/\/(view|edit)\/\[id\]$/);
    if (actionMatch) {
        const action = humanize(actionMatch[1]);
        const entity = singularize(trail.at(-1)?.name || "Record");
        return query.id ? `${action} : ${entity} ID ${query.id}` : action;
    }

    return null;
};

const AppBreadcrumb = () => {
    const router = useRouter();

    if (router.pathname === "/") {
        return <Breadcrumb items={[{ title: "Home" }]} />;
    }

    const trail = findMenuTrail(menuConfig, router.pathname);
    const nestedLabel = getNestedLabel(router.pathname, router.query, trail);

    if (!trail.length) {
        const pathItems = router.pathname
            .split("/")
            .filter(Boolean)
            .filter((segment) => !segment.startsWith("["))
            .map((segment) => ({ title: humanize(segment) }));
        return <Breadcrumb separator="»" items={pathItems} />;
    }

    const breadcrumbItems = trail.map((item, index) => {
        const isLast = index === trail.length - 1 && !nestedLabel;
        return {
            title: item.link && !isLast
                ? <Link href={item.link}>{item.name}</Link>
                : item.name,
        };
    });

    if (nestedLabel) breadcrumbItems.push({ title: nestedLabel });

    return <Breadcrumb separator="»" items={breadcrumbItems} />;
};

export default AppBreadcrumb;
