export default defineAppConfig({
  ui: {
    colors: {
      primary: "purple",
      secondary: "green",
    },
    toast: {
      slots: {
        root: "rounded-none border-2 border-black",
        icon: "size-10",
        title: "text-base font-bold",
        description: "text-base text-black",
        close: "hover:bg-transparent",
      },
    },
    button: {
      slots: {
        base: "rounded-none cursor-pointer font-semibold tracking-wider hover:bg-blue-200 disabled:cursor-default",
      },
      defaultVariants: {
        color: "purple",
        size: "md",
      },
      variants: {
        color: {
          primary: "text-white bg-purple-500 hover:bg-purple-600",
          purple: "text-white bg-purple-500 hover:bg-purple-600",
          orange: "text-white bg-orange-500 hover:bg-orange-600",
          blue: "text-white bg-blue-500 hover:bg-blue-600",
          green: "text-white bg-green-500 hover:bg-green-600",
          pink: "text-white bg-pink-500 hover:bg-pink-600",
          red: "text-white bg-red-500 hover:bg-red-600",
          gray: "text-black bg-gray-200 hover:bg-gray-300",
          none: "text-black bg-transparent hover:bg-transparent",
        },
        size: {
          sm: {
            base: "text-sm px-3 py-2",
          },
          md: {
            base: "text-base px-4 py-2.5",
          },
          lg: {
            base: "text-lg px-5 py-3",
          },
        },
      },
    },
    input: {
      slots: {
        root: "w-full outline-none",
        base: "rounded-none h-13 !pl-4",
      },
      variants: {
        variant: {
          outline: "ring-black",
        },
      },
    },
    checkbox: {
      slots: {
        base: "rounded-none ring-black cursor-pointer",
        label: "text-black -mt-0.5",
      },
      variants: {
        size: {
          md: "h-5 w-5",
        },
        variant: {
          card: {
            root: "w-full rounded-none border border-black px-4 pt-4 !pb-3",
          },
        },
        color: {
          error: {
            root: "border-red-500",
          },
        },
      },
    },
    modal: {
      variants: {
        fullscreen: {
          false: {
            content: "rounded-none ring-black ring-2 overflow-y-auto",
          },
        },
      },
    },
    selectMenu: {
      slots: {
        base: "rounded-none w-full h-12",
        placeholder: "text-gray-900",
      },
      variants: {
        variant: {
          outline: "ring-black ",
        },
      },
    },
    formField: {
      variants: {
        size: {
          md: "text-base",
        },
      },
    },
    textarea: {
      slots: {
        root: "w-full outline-none",
        base: "rounded-none !p-4 outline-black",
      },
      variants: {
        variant: {
          outline: "text-highlighted bg-default ring ring-inset ring-black",
        },
        size: {
          md: {
            base: "text-base",
          },
        },
      },
    },
    radioGroup: {
      slots: {
        base: "ring-black",
        label: "block font-medium text-black",
        item: "has-data-[state=checked]:bg-purple-50 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-purple-500 ",
      },
      variants: {
        variant: {
          card: {
            item: "rounded-none border-black cursor-pointer ",
          },
        },
        color: {
          error: {
            item: "border-red-500",
          },
        },
        size: {
          md: {
            label: "text-base",
            legend: "text-base",
            item: "text-base",
          },
        },
        orientation: {
          vertical: {
            fieldset: "flex-col space-y-1",
          },
        },
      },
    },
  },
});
