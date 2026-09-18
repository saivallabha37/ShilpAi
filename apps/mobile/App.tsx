import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList } from 'react-native';
import { requestOtp, verifyOtp, getMyProducts } from './src/api';

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState('1234567890');
  const [otpCode, setOtpCode] = useState('123456');
  const [step, setStep] = useState('LOGIN'); // LOGIN, OTP, PRODUCTS
  const [products, setProducts] = useState([]);

  const handleRequestOtp = async () => {
    await requestOtp(phoneNumber);
    setStep('OTP');
  };

  const handleVerifyOtp = async () => {
    await verifyOtp(phoneNumber, otpCode);
    const prods = await getMyProducts();
    setProducts(prods);
    setStep('PRODUCTS');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ShilpAI Artisan Portal</Text>
      
      {step === 'LOGIN' && (
        <View style={styles.card}>
          <Text>Enter Phone Number:</Text>
          <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
          <Button title="Get OTP" onPress={handleRequestOtp} />
        </View>
      )}

      {step === 'OTP' && (
        <View style={styles.card}>
          <Text>Enter OTP:</Text>
          <TextInput style={styles.input} value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" />
          <Button title="Verify OTP" onPress={handleVerifyOtp} />
        </View>
      )}

      {step === 'PRODUCTS' && (
        <View style={styles.card}>
          <Text style={styles.subtitle}>My Products</Text>
          <FlatList 
            data={products}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }) => (
              <View style={styles.productRow}>
                <Text>{item.name}</Text>
                <Text>{item.status}</Text>
              </View>
            )}
            ListEmptyComponent={<Text>No products yet.</Text>}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  card: { width: '100%', padding: 20, backgroundColor: '#f9f9f9', borderRadius: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 10, borderRadius: 4 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderColor: '#eee' }
});

