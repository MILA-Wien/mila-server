export default defineAppConfig({
  ui: {
    primary: "purple",
    gray: "cool",
    button: {
      base: "focus:outline-none focus-visible:outline-0 disabled:cursor-default disabled:opacity-75 aria-disabled:cursor-default aria-disabled:opacity-75 flex-shrink-0",
      font: "font-semibold tracking-wider",
      rounded: "rounded-sm",
      size: {
        sm: "text-sm",
        md: "text-base",
      },
      gap: {
        sm: "gap-x-2.5",
        md: "gap-x-2.5",
      },
      padding: {
        sm: "px-3 py-2",
        md: "px-3.5 py-2.5",
        lg: "px-4 py-3",
      },
      icon: {
        size: {
          sm: "h-4 w-4",
          md: "h-5 w-5",
          lg: "h-5 w-5",
        },
      },
      default: {
        size: "md",
      },
    },
    card: {
      base: "mb-5 lg:mb-10 last:mb-0",
      background: "bg-white",
      rounded: "rounded-[20px]",
      divide: "divide-none",
      ring: "ring-1 ring-[#F0F0F0]",
      shadow: "shadow-none",
      body: {
        base: "",
        background: "",
        padding: "p-5 lg:p-10",
      },
    },
    alert: {
      title: "text-lg font-semibold text-primary",
      description: "text-primary/60 text-sm font-medium leading-6 mt-2",
      padding: "p-3 lg:p-5",
      rounded: "rounded-xl",
      icon: {
        base: "flex-shrink-0 h-7 w-7",
      },
      color: {
        success: {
          ghost: "bg-cyan-500 ring-1 bg-cyan-500/50 text-cyan-500",
        },
        error: {
          ghost: "bg-red-light ring-1 ring-red-500/40 text-red-500",
        },
        info: {
          ghost: "bg-blue-light ring-1 ring-blue/50 text-blue-500",
        },
        warning: {
          ghost: "bg-orange-500 ring-1 ring-orange/30 text-orange",
        },
      },
    },
    notification: {
      progress: {
        background: "white",
      },
    },
    tabs: {
      wrapper: "relative space-y-2 border-b border-purple-500",
      container: "relative w-full",
      base: "focus:outline-none",
      list: {
        base: "relative gap-8",
        background: "dark:bg-gray-800",
        rounded: "",
        shadow: "",
        padding: "",
        height: "h-[20px]",
        width: "",
        marker: {
          wrapper:
            "absolute !h-[1px] !top-[29px] left-0 duration-200 ease-out focus:outline-none",
          base: "!h-[1px]",
          background: "bg-primary dark:bg-gray-900",
          rounded: "",
          shadow: "",
        },
        tab: {
          base: "relative outline-none disabled:cursor-not-allowed disabled:opacity-75 duration-200 ease-out",
          background: "",
          active: "text-primary dark:text-white",
          inactive: "text-primary dark:text-gray-500-400",
          height: "",
          padding: "",
          size: "text-sm leading-none",
          font: "font-urbanist font-semibold",
          rounded: "",
          shadow: "",
        },
      },
    },
    pagination: {
      wrapper: "flex items-center gap-1 lg:gap-2",
      base: "h-8 w-8 lg:h-12 lg:w-12",
      color: "text-primary",
      rounded: "rounded-lg",
      default: {
        size: "pagination",
        activeButton: {
          size: "pagination",
          color: "purple",
          variant: "solid",
        },
        inactiveButton: {
          color: "gray",
          size: "pagination",
          variant: "outline",
        },
        prevButton: {
          color: "gray",
          size: "pagination",
          variant: "outline",
          class: "rtl:[&_span:first-child]:rotate-180",
          icon: "i-heroicons-chevron-left-20-solid w-5 h-5 lg:w-[26px] lg:h-[26px]",
        },
        nextButton: {
          color: "gray",
          size: "pagination",
          variant: "outline",
          class: "rtl:[&_span:last-child]:rotate-180",
          icon: "i-heroicons-chevron-right-20-solid w-5 h-5 lg:w-[26px] lg:h-[26px]",
        },
      },
    },
    formGroup: {
      label: {
        base: "block text-md font-semibold",
      },
    },
    input: {
      wrapper: "relative",
      base: "disabled:cursor-default disabled:opacity-50",
      size: {
        md: "text-sm",
      },
      variant: {
        solid:
          "h-[50px] shadow-sm bg-blue-50 focus:bg-primary-50 text-gray-900 ring-0 focus:ring-0",
      },
      padding: {
        md: "py-4 px-[18px] pe-9",
        numberInput: "py-4 px-[18px] pe-[56px]",
      },
      rounded: "rounded-none",
      icon: {
        color: "text-gray-500",
        trailing: {
          wrapper: "end-[5px]",
        },
      },
      default: {
        size: "md",
        color: "primary",
        variant: "solid",
      },
    },
    textarea: {
      variant: {
        solid:
          "shadow-sm bg-blue-50 focus:bg-primary-50 text-gray-900 ring-0 focus:ring-0",
      },
      padding: {
        baseSize: "py-4 px-[18px]",
      },
      rounded: "rounded-sm",
      default: {
        size: "md",
        color: "blue",
        variant: "solid",
      },
    },
    select: {
      base: "h-[50px] disabled:cursor-default disabled:opacity-50",
      rounded: "rounded-none",
      variant: {
        solid:
          "bg-blue-50 focus:bg-primary-50 text-gray-900 ring-0 focus:ring-0",
      },
      padding: {
        md: "py-4 px-[18px] pe-9",
      },
      icon: {
        trailing: {
          wrapper: "end-[5px] text-gray-500",
        },
      },
      color: {
        variant: {
          outline:
            "shadow-none bg-transparent text-gray-900 dark:text-white ring-1 ring-inset ring-{color}-500 dark:ring-{color}-400 focus:ring-2 focus:ring-{color}-500 dark:focus:ring-{color}-400",
          none: "bg-transparent focus:ring-0 focus:shadow-none",
        },
      },
      default: {
        size: "md",
        color: "blue",
        variant: "solid",
      },
    },
    selectMenu: {
      ring: "ring-0 ring-inset",
      shadow: "shadow-lg",
      rounded: "rounded-none",
      option: {
        rounded: "rounded-none",
      },
    },
    checkbox: {
      base: "h-[20px] w-[20px] disabled:cursor-not-allowed cursor-pointer disabled:opacity-50 focus:ring-0 focus:ring-transparent focus:ring-offset-transparent",
      background: "bg-transparent",
      rounded: "rounded-none",
      border: "border border-black border-2",
      label: "text-sm font-medium",
    },

    radioGroup: {
      wrapper: "flex items-start",
      fieldset: "w-full",
    },
    radio: {
      wrapper:
        "relative flex items-start bg-[#F4F7FE] shadow-sm rounded-sm mb-2 last:mb-0 px-5 py-3",
      container: "flex items-center h-5",
      base: "h-4 w-4 dark:checked:bg-current dark:checked:border-transparent disabled:opacity-50 disabled:cursor-not-allowed focus:ring-0 focus:ring-transparent focus:ring-offset-transparent",
      form: "form-radio",
      color: "text-{color}-500 dark:text-{color}-400",
      background: "bg-white dark:bg-gray-900",
      border: "border border-gray-300 dark:border-gray-700",
      ring: "focus-visible:ring-2 focus-visible:ring-{color}-500 dark:focus-visible:ring-{color}-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
      inner: "ms-3 flex flex-col",
      label: "text-sm font-medium text-gray-700 dark:text-gray-200",
      required: "text-sm text-red-500 dark:text-red-400",
      help: "text-sm text-gray-500 dark:text-gray-400",
      default: {
        color: "primary",
      },
    },
  },
});
