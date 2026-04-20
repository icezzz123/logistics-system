from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch


MODULE_BOXES = {
    "用户与权限管理": {
        "pos": (0.08, 0.73),
        "size": (0.22, 0.12),
        "subtitle": "注册登录 / 角色管理 / RBAC权限",
        "color": "#E8F4FD",
    },
    "订单管理": {
        "pos": (0.39, 0.80),
        "size": (0.22, 0.12),
        "subtitle": "创建录入 / 状态流转 / 统计分析",
        "color": "#E8F5E9",
    },
    "调度管理": {
        "pos": (0.70, 0.73),
        "size": (0.22, 0.12),
        "subtitle": "路径优化 / 批次调度 / 运输计划",
        "color": "#F3E5F5",
    },
    "站点与库存管理": {
        "pos": (0.06, 0.46),
        "size": (0.24, 0.12),
        "subtitle": "站点维护 / 入出库扫描 / 库存预警",
        "color": "#FFF8E1",
    },
    "运输管理": {
        "pos": (0.70, 0.46),
        "size": (0.22, 0.12),
        "subtitle": "车辆任务 / 装卸扫描 / 监控成本",
        "color": "#E0F7FA",
    },
    "分拣管理": {
        "pos": (0.08, 0.19),
        "size": (0.22, 0.12),
        "subtitle": "规则配置 / 路由匹配 / 分拣扫描",
        "color": "#FFF3E0",
    },
    "物流追踪": {
        "pos": (0.39, 0.08),
        "size": (0.22, 0.12),
        "subtitle": "追踪记录 / 时间轴 / 时效预警",
        "color": "#EDE7F6",
    },
    "异常管理": {
        "pos": (0.70, 0.19),
        "size": (0.22, 0.12),
        "subtitle": "异常上报 / 分配处理 / 关闭统计",
        "color": "#FBE9E7",
    },
}


CENTER_BOX = {
    "title": "跨境物流作业系统",
    "subtitle": "功能需求总览",
    "pos": (0.36, 0.42),
    "size": (0.28, 0.16),
    "color": "#DCEEFF",
}


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
        ax.text(center_x, y + h * 0.30, subtitle, ha="center", va="center", fontsize=10.2, color="#425466")
    else:
        ax.text(center_x, y + h / 2, title, ha="center", va="center", fontsize=15, fontweight="bold")


def _draw_links(ax) -> None:
    center_x, center_y = _box_center(CENTER_BOX)
    for module_name, box in MODULE_BOXES.items():
        module_x, module_y = _box_center(box)
        ax.plot(
            [center_x, module_x],
            [center_y, module_y],
            color="#5E6B78",
            linewidth=1.5,
            zorder=0,
        )
        mid_x = (center_x + module_x) / 2
        mid_y = (center_y + module_y) / 2
        ax.scatter(mid_x, mid_y, s=10, color="#B0BEC5", zorder=1)


def build_figure():
    _configure_fonts()
    fig, ax = plt.subplots(figsize=(14, 9))
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    _draw_links(ax)
    _draw_box(ax, CENTER_BOX, CENTER_BOX["title"], CENTER_BOX["subtitle"], edge_color="#5B9BD5")

    for module_name, box in MODULE_BOXES.items():
        _draw_box(ax, box, module_name, box["subtitle"])

    ax.text(
        0.5,
        0.965,
        "图3-4 系统功能模块图",
        ha="center",
        va="center",
        fontsize=18,
        fontweight="bold",
        color="#233143",
    )

    return fig


def main() -> None:
    parser = argparse.ArgumentParser(description="生成图3-4 系统功能模块图")
    parser.add_argument(
        "--output-dir",
        default="docs/figures",
        help="输出目录，默认保存到 docs/figures",
    )
    parser.add_argument(
        "--basename",
        default="figure_3_4_function_modules",
        help="输出文件基础名，默认 figure_3_4_function_modules",
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
