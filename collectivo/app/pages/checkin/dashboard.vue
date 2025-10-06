<script setup>
setPageLayout("checkin");
import { useRouter } from "vue-router";

const router = useRouter();
router.replace({ name: "index" });
</script>
