import ModuleComponent from './module.vue';

export default {
  id: 'weekly-upload',
  name: '周报上传',
  icon: 'upload_file',
  color: '#1f6f5b',
  routes: [
    {
      path: '',
      component: ModuleComponent,
    },
  ],
};
