import {
  createItem,
  createItems,
  createUser,
  deleteItems,
  readRoles,
  readUsers,
  updateUser,
} from "@directus/sdk";

export default defineEventHandler(async (_event) => {
  create_examples();
});

async function getRole(name: string) {
  const directus = await useDirectusAdmin();

  const membersRoles = await directus.request(
    readRoles({
      filter: {
        name: { _eq: name },
      },
    }),
  );

  if (membersRoles.length < 1) {
    throw new Error(name + " role not found");
  }

  return membersRoles[0].id;
}

async function create_examples() {
  console.info("Creating example data for collectivo");

  const directus = await useDirectusAdmin();

  const userRole = await getRole("collectivo_user");
  const editorRole = await getRole("collectivo_editor");
  const adminRole = await getRole("collectivo_admin");

  // Create some users
  console.info("Creating users");

  const userNames = [
    "Admin",
    "Editor",
    "User",
    "Alice",
    "Bob",
    "Charlie",
    "Dave",
  ];

  const users = [];

  for (const userName of userNames) {
    const email = `${userName.toLowerCase()}@example.com`;

    const u = {
      first_name: userName,
      last_name: "Example",
      email: email,
      role: userRole,
      provider: "keycloak",
      status: "active",
      external_identifier: email,
    };

    if (userName == "Admin") {
      u.role = adminRole;
    }

    if (userName == "Editor") {
      u.role = editorRole;
    }

    users.push(u);
  }

  for (const user of users) {
    const usersDB = await directus.request(
      readUsers({
        filter: { email: { _eq: user.email } },
      }),
    );

    let userID;

    if (usersDB.length > 0) {
      userID = usersDB[0].id;
      // tslint:disable-next-line:no-console
      console.info("Updating user " + user.email + " with ID " + userID);
      await directus.request(updateUser(userID, user));
      // tslint:disable-next-line:no-console
      console.info("Updated good");
    } else {
      // tslint:disable-next-line:no-console
      console.info("Creating user " + user.email);
      const us = await directus.request(createUser(user));
      userID = us.id;
    }
  }

  // Create some tags
  console.info("Creating tags");
  await directus.request(deleteItems("collectivo_tags", { limit: 1000 }));
  const tagNames = ["Has a dog", "Has a cat", "Has a bird", "Has a fish"];
  const tags: any[] = [];

  for (const tagName of tagNames) {
    tags.push({
      tags_name: tagName,
    });
  }

  // Add some members to some tags
  // TODO: This is not working
  // console.info("Creating tag-member relations");
  // for (var i = 0; i < 3; i++) {
  //   tags[i].directus_users = {
  //     create: [
  //       { collectivo_tags_id: "+", directus_users_id: { id: 1 } },
  //       { collectivo_tags_id: "+", directus_users_id: { id: 2 } },
  //       { collectivo_tags_id: "+", directus_users_id: { id: 3 } },
  //     ],
  //   };
  // }

  try {
    await directus.request(createItems("collectivo_tags", tags));
  } catch (error) {
    console.info(error);
  }

  // Create email templates
  console.info("Creating email templates");
  await directus.request(deleteItems("messages_templates", { limit: 1000 }));
  const templates = [];

  for (const i in [1, 2, 3]) {
    templates.push({
      messages_name: `Example Template ${i}`,
      messages_method: "email",
      messages_subject: `Example Subject ${i}`,
      messages_content:
        "Hello {{recipient_first_name}} {{recipient_last_name}}. \n This is a second line.",
    });
  }

  const templateIds = [];

  try {
    const ids = await directus.request(
      createItems("messages_templates", templates),
    );

    templateIds.push(...ids);
  } catch (error) {
    console.info(error);
  }

  // Create some tiles
  console.info("Creating tiles");
  await directus.request(deleteItems("collectivo_tiles", { limit: 1000 }));

  const tileData = [
    {
      name: "Tile 1",
      color: "primary",
    },
    {
      name: "Tile 2",
      color: "green",
    },
    {
      name: "Tile 3",
      color: "orange",
    },
    {
      name: "Tile 4",
      color: "blue",
    },
  ];

  const tiles = [];

  const tileButton = {
    tiles_label: "Example Button",
    tiles_path: "/some/path",
    tiles_tile: "",
  };

  for (const td of tileData) {
    tiles.push({
      tiles_name: td.name,
      tiles_content: "Hello! I am an example tile!",
      tiles_color: td.color,
      tiles_status: "published",
    });
  }

  try {
    const tilesRes = await directus.request(
      createItems("collectivo_tiles", tiles),
    );

    for (const tile of tilesRes) {
      tileButton.tiles_tile = tile.id;

      await directus.request(
        createItem("collectivo_tiles_buttons", tileButton),
      );
    }
  } catch (error) {
    console.info(error);
  }
}

// export default async function examples() {
//   console.info("Creating example data for payments");

//   const directus = await useDirectusAdmin();

//   // Clean up old data
//   await directus.request(deleteItems("payments_invoices_out", { limit: 1000 }));

//   const invoice_ids = [];

//   const users = await directus.request(
//     readUsers({ filter: { first_name: "Alice" } }),
//   );

//   for (const status of ["pending", "paid"]) {
//     const res = await directus.request(
//       createItem("payments_invoices_out", {
//         payments_recipient_user: users[0].id,
//         payments_status: status,
//         payments_date_issued: new Date(),
//       }),
//     );

//     invoice_ids.push(res.id);
//   }

//   for (const invoice_id of invoice_ids) {
//     await directus.request(
//       createItem("payments_invoices_entries", {
//         payments_invoice: invoice_id,
//         payments_description: "Test item",
//         payments_quantity: 1,
//         payments_price: 100,
//       }),
//     );
//   }
// }

// import { createItem, deleteItems, readUsers } from "@directus/sdk";

// export default async function examples() {
//   console.info("Creating example data for memberships");

//   const directus = await useDirectusAdmin();

//   // Clean up old data
//   await directus.request(deleteItems("memberships", { limit: 1000 }));

//   // Create some memberships
//   console.info("Creating memberships");

//   const users = [
//     ["Alice", "applied"],
//     ["Bob", "approved"],
//     ["Charlie", "approved"],
//     ["Dave", "in-cancellation"],
//     ["User", "approved"],
//   ];

//   for (const user of users) {
//     console.log("reading user");
//     // Get user id
//     const user_id = (
//       await directus.request(readUsers({ filter: { first_name: user[0] } }))
//     )[0];

//     // Create membership
//     console.log("creating  mship", user_id);
//     await directus.request(
//       createItem("memberships", {
//         memberships_user: user_id,
//         memberships_type: "normal",
//         memberships_status: user[1],
//       }),
//     );
//   }
// }

// import {
//   createItem,
//   createItems,
//   deleteItems,
//   readItems,
//   readUsers,
// } from "@directus/sdk";

// import { DateTime } from "luxon";

// import { getRandomInt } from "../utils/getRandomInt";
// import { ItemStatus } from "@collectivo/collectivo/server/utils/directusFields";

// const times_of_day = [10, 13, 16, 19];

// export default async function examples() {
//   console.info("Creating example data for shifts");

//   await cleanShiftsData();
//   await createShifts();
//   await createSlots();
//   await createSkills();
//   await createAssignments();
//   await addSkillsToUsers();
//   await createLogs();

//   console.info("Example data for shifts created");
// }

// async function cleanShiftsData() {
//   const directus = await useDirectusAdmin();

//   const schemas = [
//     "shifts_shifts",
//     "shifts_slots",
//     "shifts_skills",
//     "shifts_assignments",
//     "shifts_skills_directus_users",
//     "shifts_logs",
//   ];

//   for (const schema of schemas) {
//     await directus.request(deleteItems(schema, { limit: 1000 }));
//   }
// }

// async function createShifts() {
//   const directus = await useDirectusAdmin();

//   const monday = SHIFT_CYCLE_START;
//   const shiftsRequests: ShiftsShift[] = [];

//   const nb_weeks = SHIFT_CYCLE_DURATION_WEEKS;

//   for (let week = 0; week < nb_weeks; week++) {
//     for (let weekday = 0; weekday < 5; weekday++) {
//       const day = monday.plus({ days: weekday, week: week });

//       for (const time_of_day of times_of_day) {
//         shiftsRequests.push({
//           shifts_name: "Shop (week " + ["A", "B", "C", "D"][week] + ")",
//           shifts_from: day.set({ hour: time_of_day }).toString(),
//           shifts_to: day.set({ hour: time_of_day + 3 }).toString(),
//           shifts_from_time: "10:00",
//           shifts_to_time: "13:00",
//           shifts_repeats_every: nb_weeks * 7,
//           shifts_status: ItemStatus.PUBLISHED,
//         });
//       }
//     }
//   }

//   await directus.request(createItems("shifts_shifts", shiftsRequests));
// }

// async function createSlots() {
//   const directus = await useDirectusAdmin();

//   const shifts = await directus.request(readItems("shifts_shifts"));
//   const slotsRequests = [];

//   for (const shift of shifts) {
//     if (shift["shifts_time"] == times_of_day[times_of_day.length - 1]) {
//       for (let i = 0; i < 2; i++) {
//         slotsRequests.push({
//           shifts_name: "Cleaning",
//           shifts_shift: shift.id,
//           shifts_status: ItemStatus.PUBLISHED,
//         });
//       }
//     } else {
//       slotsRequests.push({
//         shifts_name: "Cashier",
//         shifts_shift: shift.id,
//         shifts_status: ItemStatus.PUBLISHED,
//       });

//       for (let i = 0; i < 2; i++) {
//         slotsRequests.push({
//           shifts_name: "Shelves",
//           shifts_shift: shift.id,
//           shifts_status: ItemStatus.PUBLISHED,
//         });
//       }
//     }
//   }

//   await directus.request(createItems("shifts_slots", slotsRequests));
// }

// async function createSkills() {
//   const directus = await useDirectusAdmin();

//   const cashierSkill = await directus.request(
//     createItem("shifts_skills", {
//       shifts_name: "Cashier",
//       shifts_status: ItemStatus.PUBLISHED,
//     }),
//   );

//   await directus.request(
//     createItem("shifts_skills", {
//       shifts_name: "First aid",
//       shifts_status: ItemStatus.PUBLISHED,
//     }),
//   );

//   const slots = await directus.request(
//     readItems("shifts_slots", {
//       fields: ["id"],
//       filter: { shifts_name: { _eq: "Cashier" } },
//     }),
//   );

//   const requests = [];

//   for (const slot of slots) {
//     requests.push({
//       shifts_skills_id: cashierSkill.id,
//       shifts_slots_id: slot.id,
//     });
//   }

//   await directus.request(createItems("shifts_skills_shifts_slots", requests));
// }

// async function createAssignments() {
//   const directus = await useDirectusAdmin();

//   const slots = await directus.request(
//     readItems("shifts_slots", {
//       fields: ["id"],
//     }),
//   );

//   const users = await directus.request(
//     readUsers({
//       fields: ["id"],
//     }),
//   );

//   const assignments = [];

//   for (const user of users) {
//     const slot = slots.pop();

//     if (!slot) {
//       break;
//     }

//     assignments.push({
//       shifts_from: DateTime.now().toString(),
//       shifts_slot: slot.id,
//       shifts_user: user.id,
//       shifts_status: ItemStatus.PUBLISHED,
//     });
//   }

//   await directus.request(createItems("shifts_assignments", assignments));
// }

// async function addSkillsToUsers() {
//   const directus = await useDirectusAdmin();

//   const skills = await directus.request(
//     readItems("shifts_skills", {
//       fields: ["id", "shifts_name"],
//     }),
//   );

//   if (!skills) return;

//   const users = await directus.request(
//     readUsers({
//       fields: ["id"],
//     }),
//   );

//   const links: ShiftsSkillUserLink[] = [];

//   users.forEach((user, index) => {
//     const skill = skills[index % skills.length];

//     links.push({
//       directus_users_id: user.id,
//       shifts_skills_id: skill.id,
//     });
//   });

//   await directus.request(createItems("shifts_skills_directus_users", links));
// }

// async function createLogs() {
//   const directus = await useDirectusAdmin();

//   const assignments = await directus.request(
//     readItems("shifts_assignments", {
//       fields: ["*"],
//     }),
//   );

//   const requests: ShiftsLog[] = [];

//   for (const assignment of assignments) {
//     const nbLogs = getRandomInt(5, 20);

//     for (let i = 0; i < nbLogs; i++) {
//       const types = [
//         ShiftLogType.ATTENDED,
//         ShiftLogType.ATTENDED,
//         ShiftLogType.MISSED,
//         ShiftLogType.CANCELLED,
//       ];

//       requests.push({
//         shifts_type: types[getRandomInt(0, types.length)],
//         shifts_date: DateTime.now()
//           .plus({ days: getRandomInt(-10, 10) })
//           .toISO(),
//         shifts_assignment: assignment.id,
//         shifts_user: assignment.shifts_user,
//       });
//     }
//   }

//   await directus.request(createItems("shifts_logs", requests));
// }
