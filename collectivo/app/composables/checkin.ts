interface CheckinState {
  cardId?: string;
  membership?: string;
  membershipsType?: string;
  username?: string;
  pronouns?: string;
  shiftScore?: number;
  shiftsType?: string;
  isOnHoliday?: boolean;
  canShop?: boolean;
  coshopper?: string;
  error?: string;
}

export const useCheckinState = () =>
  useState<CheckinState>("checkinState", () => ({}));
