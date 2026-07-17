<script setup>
defineProps({ titulo: { type: String, default: '' } })
const emit = defineEmits(['close'])
</script>

<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h2 class="text-base font-semibold text-slate-900">{{ titulo }}</h2>
        <button class="text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>
      <div class="p-5">
        <slot />
      </div>
    </div>
  </div>
</template>
