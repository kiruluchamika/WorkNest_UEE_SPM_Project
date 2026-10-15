import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, shadows } from "../../theme/colors";
import { radius, spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { SelectOption } from "./Select";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";

interface SearchableSelectProps {
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  emptyMessage?: string;
  triggerStyle?: StyleProp<ViewStyle>;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label, labelStyle, value, options, onChange, placeholder = "Select an option...",
  searchPlaceholder = "Search...", error, emptyMessage = "No options found",
  triggerStyle,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? options.filter((option) => option.label.toLocaleLowerCase().includes(normalized)) : options;
  }, [options, query]);
  const close = () => { setOpen(false); setQuery(""); };

  return <View style={styles.container}>
    <Text style={[styles.label, labelStyle]}>{label}</Text>
    <TouchableOpacity style={[styles.trigger, triggerStyle, error && styles.triggerError]} onPress={() => setOpen(true)} activeOpacity={0.8}>
      <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>{selected?.label ?? placeholder}</Text>
      <Feather name="chevron-down" size={16} color={colors.textMuted}/>
    </TouchableOpacity>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}><Text style={styles.title}>{label}</Text><TouchableOpacity onPress={close} style={styles.close}><Feather name="x" size={16} color={colors.text}/></TouchableOpacity></View>
          <View style={styles.searchBox}><Feather name="search" size={16} color={colors.textMuted}/><TextInput autoFocus value={query} onChangeText={setQuery} placeholder={searchPlaceholder} placeholderTextColor={colors.textMuted} style={styles.searchInput}/></View>
          {filtered.length ? <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {filtered.map((option) => <TouchableOpacity key={option.value} style={[styles.option, option.value === value && styles.selected]} onPress={() => { onChange(option.value); close(); }}>
              <Text style={[styles.optionText, option.value === value && styles.selectedText]}>{option.label}</Text>
              {option.value === value ? <Feather name="check" size={16} color={colors.primary}/> : null}
            </TouchableOpacity>)}
          </ScrollView> : <Text style={styles.empty}>{emptyMessage}</Text>}
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
};

const styles = StyleSheet.create({
  container:{marginBottom:spacing.md},label:{fontSize:typography.sizes.sm,fontWeight:"600",color:colors.text,marginBottom:spacing.sm},
  trigger:{backgroundColor:colors.cream,borderWidth:1,borderColor:colors.cream,borderRadius:radius.md,paddingHorizontal:spacing.md,paddingVertical:spacing.md,flexDirection:"row",alignItems:"center"},triggerError:{borderColor:colors.danger},triggerText:{fontSize:typography.sizes.base,color:colors.text,flex:1},placeholder:{color:colors.textMuted},error:{fontSize:typography.sizes.sm,color:colors.danger,marginTop:spacing.xs},
  backdrop:{flex:1,backgroundColor:"rgba(31, 42, 46, 0.35)",justifyContent:"flex-end"},sheet:{backgroundColor:colors.surface,borderTopLeftRadius:radius.lg,borderTopRightRadius:radius.lg,padding:spacing.md,paddingBottom:spacing.xl,...shadows.medium,shadowColor:colors.shadow},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:spacing.md},title:{fontSize:typography.sizes.base,fontWeight:"800",color:colors.text},close:{width:28,height:28,borderRadius:radius.full,backgroundColor:colors.cream,alignItems:"center",justifyContent:"center"},
  searchBox:{flexDirection:"row",alignItems:"center",backgroundColor:colors.cream,borderRadius:radius.md,paddingHorizontal:spacing.md,marginBottom:spacing.sm},searchInput:{flex:1,paddingVertical:spacing.md,paddingHorizontal:spacing.sm,fontSize:typography.sizes.base,color:colors.text},list:{maxHeight:340},option:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:spacing.md,paddingHorizontal:spacing.sm,borderRadius:radius.md},selected:{backgroundColor:colors.primarySoft},optionText:{fontSize:typography.sizes.base,color:colors.text,fontWeight:"600"},selectedText:{color:colors.primaryDark,fontWeight:"800"},empty:{fontSize:typography.sizes.sm,color:colors.textMuted,paddingVertical:spacing.lg,textAlign:"center"},
});
