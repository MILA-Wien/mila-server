export const useDashboardTiles = () =>
  useState<DashboardTileStore>(
    "collectivo_tiles",
    () => new DashboardTileStore(),
  );

class DashboardTileStore {
  data: DashboardTile[] | null;
  loading: boolean;
  error: unknown;

  constructor() {
    this.data = null;
    this.loading = false;
    this.error = null;
  }

  async load() {
    this.loading = true;

    try {
      const allTiles = await $fetch<DashboardTile[]>("/api/tiles");
      this.data = filterTiles(allTiles);
    } catch (error) {
      this.error = error;
    }

    this.loading = false;
  }
}

function filterTiles(tiles: DashboardTile[]) {
  const user = useCurrentUser();
  return tiles.filter((tile) => {
    let display = true;

    if (tile.tiles_tag_required) {
      display = user.value.tags.includes(tile.tiles_tag_required);
    }

    if (
      (tile.tiles_view_for === "members" && !user.value.isMember) ||
      (tile.tiles_view_for === "non-members" && user.value.isMember) ||
      (tile.tiles_view_for === "members-active" &&
        user.value.membership?.memberships_type !== "Aktiv") ||
      (tile.tiles_view_for === "members-investing" &&
        user.value.membership?.memberships_type !== "Investierend")
    ) {
      display = false;
    }

    return display;
  });
}
