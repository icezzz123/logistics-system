from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch


ROLE_BOXES = {
    "客户": {
        "pos": (0.14, 0.72),
        "size": (0.20, 0.11),
        "subtitle": "下单 / 查询 / 追踪",
        "color": "#E8F4FD",
    },
    "快递员": {
        "pos": (0.14, 0.47),
        "size": (0.20, 0.11),
        "subtitle": "揽收 / 派送 / 签收",
        "color": "#E8F5E9",
    },
    "分拣员": {
        "pos": (0.18, 0.22),
        "size": (0.20, 0.11),
        "subtitle": "分拣扫描 / 路由匹配",
        "color": "#FFF3E0",
    },
    "调度员": {
        "pos": (0.40, 0.84),
        "size": (0.20, 0.11),
        "subtitle": "接单 / 调度 / 清关跟进",
        "color": "#F3E5F5",
    },
    "管理员": {
        "pos": (0.72, 0.72),
        "size": (0.20, 0.11),
        "subtitle": "用户 / 角色 / 权限管理",
        "color": "#ECEFF1",
    },
    "站点管理员": {
        "pos": (0.70, 0.47),
        "size": (0.22, 0.11),
        "subtitle": "入出库 / 库存 / 站点作业",
        "color": "#FFF8E1",
    },
    "司机": {
        "pos": (0.72, 0.22),
        "size": (0.20, 0.11),
        "subtitle": "装卸扫描 / 干线运输",
        "color": "#E0F7FA",
    },
}


CENTER_BOX = {
    "title": "跨境物流作业系统",
    "pos": (0.39, 0.48),
    "size": (0.24, 0.13),
    "color": "#DCEEFF",
}


COLLABORATIONS = [
    {"left": "客户", "right": "快递员", "label": "业务交互", "label_pos": (0.24, 0.64)},
    # 这条协同关系从左侧执行角色到右侧站点角色，若使用直线会穿过中心系统框。
    # 因此改为从系统框上方绕行的折线。
    {
        "left": "快递员",
        "right": "站点管理员",
        "label": "货物交接",
        "label_pos": (0.56, 0.415),
        "route": [(0.35, 0.525), (0.35, 0.415), (0.94, 0.415), (0.94, 0.525)],
    },
    {"left": "站点管理员", "right": "分拣员", "label": "站内协同", "label_pos": (0.68, 0.464)},
    {"left": "分拣员", "right": "司机", "label": "作业衔接", "label_pos": (0.55, 0.275)},
    # 这条协同线若直接连线会切过中心框，因此改为沿右侧空白区域上行。
    {
        "left": "司机",
        "right": "调度员",
        "label": "运输协同",
        "label_pos": (0.88, 0.87),
        "route": [(0.95, 0.275), (0.95, 0.87), (0.64, 0.87), (0.64, 0.895)],
    },
    {"left": "调度员", "right": "管理员", "label": "管理协同", "label_pos": (0.70, 0.82)},
]


def _configure_fonts() -> None:
    matplotlib.rcParams["font.sans-serif"] = [
        "Microsoft YaHei",
        "SimHei",
        "Noto Sans CJK SC",
        "Source Han Sans SC",
        "Arial Unicode MS",
        "DejaVu Sans",
    ]
    matplotlib.rcParams["axes.unicode_minus"] = False


def _box_center(box: dict) -> tuple[float, float]:
    x, y = box["pos"]
    w, h = box["size"]
    return x + w / 2, y + h / 2


def _draw_box(ax, box: dict, title: str, subtitle: str | None = None, edge_color: str = "#5E6B78") -> None:
    x, y = box["pos"]
    w, h = box["size"]
    patch = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle="round,pad=0.012,rounding_size=0.02",
        linewidth=1.8,
        edgecolor=edge_color,
        facecolor=box["color"],
    )
    ax.add_patch(patch)

    center_x = x + w / 2
    if subtitle:
        ax.text(center_x, y + h * 0.63, title, ha="center", va="center", fontsize=14, fontweight="bold")
        ax.text(center_x, y + h * 0.30, subtitle, ha="center", va="center", fontsize=10.5, color="#425466")
    else:
        ax.text(center_x, y + h / 2, title, ha="center", va="center", fontsize=15, fontweight="bold")


def _draw_system_links(ax) -> None:
    center = _box_center(CENTER_BOX)
    for role_box in ROLE_BOXES.values():
        role_center = _box_center(role_box)
        ax.plot(
            [center[0], role_center[0]],
            [center[1], role_center[1]],
            color="#5E6B78",
            linewidth=1.5,
            zorder=0,
        )


def _draw_collaboration_links(ax) -> None:
    for item in COLLABORATIONS:
        left = item["left"]
        right = item["right"]
        label = item["label"]
        dx, dy = item.get("offset", (0.0, 0.0))

        p1 = _box_center(ROLE_BOXES[left])
        p2 = _box_center(ROLE_BOXES[right])
        route = item.get("route")
        if route:
            points = [p1, *route, p2]
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
        else:
            xs = [p1[0], p2[0]]
            ys = [p1[1], p2[1]]

        ax.plot(
            xs,
            ys,
            color="#999999",
            linewidth=1.2,
            linestyle=(0, (4, 3)),
            zorder=0,
        )
        mid_x = (p1[0] + p2[0]) / 2
        mid_y = (p1[1] + p2[1]) / 2
        label_x, label_y = item.get("label_pos", (mid_x + dx, mid_y + dy))
        ax.text(
            label_x,
            label_y,
            label,
            ha="center",
            va="center",
            fontsize=9.5,
            color="#6B7280",
            bbox={"boxstyle": "round,pad=0.15", "fc": "white", "ec": "none", "alpha": 0.9},
        )


def build_figure():
    _configure_fonts()
    fig, ax = plt.subplots(figsize=(14, 8))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    _draw_system_links(ax)
    _draw_collaboration_links(ax)
    _draw_box(ax, CENTER_BOX, CENTER_BOX["title"], edge_color="#5B9BD5")

    for role_name, box in ROLE_BOXES.items():
        _draw_box(ax, box, role_name, box["subtitle"])

    return fig


def main() -> None:
    parser = argparse.ArgumentParser(description="生成图3.3 用户角色关系图")
    parser.add_argument(
        "--output-dir",
        default="docs/figures",
        help="输出目录，默认保存到 docs/figures",
    )
    parser.add_argument(
        "--basename",
        default="figure_3_3_user_roles",
        help="输出文件基础名，默认 figure_3_3_user_roles",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    fig = build_figure()
    png_path = output_dir / f"{args.basename}.png"
    svg_path = output_dir / f"{args.basename}.svg"

    fig.savefig(png_path, dpi=300, bbox_inches="tight")
    fig.savefig(svg_path, bbox_inches="tight")
    plt.close(fig)

    print(f"PNG: {png_path.resolve()}")
    print(f"SVG: {svg_path.resolve()}")


if __name__ == "__main__":
    main()
